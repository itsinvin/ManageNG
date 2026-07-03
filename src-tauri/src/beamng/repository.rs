use crate::error::{ManageNgError, Result};
use regex::Regex;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

const RESOURCES_URL: &str = "https://www.beamng.com/resources/";
const USER_AGENT: &str = "ManageNG/0.1.0 (BeamNG Mod Manager)";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoMod {
    pub id: String,
    pub title: String,
    pub author: String,
    pub description: String,
    pub category: String,
    pub rating: Option<f32>,
    pub downloads: Option<u32>,
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub update_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoSearchResult {
    pub mods: Vec<RepoMod>,
    pub query: String,
    pub page: u32,
    pub total_found: usize,
}

pub fn search_repository(query: &str, page: u32) -> Result<RepoSearchResult> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    let url = if query.trim().is_empty() {
        if page <= 1 {
            RESOURCES_URL.to_string()
        } else {
            format!("{}page-{}", RESOURCES_URL, page)
        }
    } else {
        format!(
            "{}?title={}&page={}",
            RESOURCES_URL,
            urlencoding(query),
            page
        )
    };

    let response = client
        .get(&url)
        .send()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(ManageNgError::Network(format!(
            "Repository returned HTTP {}",
            response.status()
        )));
    }

    let html = response
        .text()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    let mods = parse_resource_listing(&html)?;
    let total_found = mods.len();

    Ok(RepoSearchResult {
        mods,
        query: query.to_string(),
        page,
        total_found,
    })
}

pub fn fetch_mod_details(mod_url: &str) -> Result<RepoMod> {
    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    let response = client
        .get(mod_url)
        .send()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    let html = response
        .text()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    parse_resource_detail(&html, mod_url)
}

pub fn download_mod(mod_url: &str, dest_dir: &std::path::Path) -> Result<std::path::PathBuf> {
    let details = fetch_mod_details(mod_url)?;
    let client = reqwest::blocking::Client::builder()
        .user_agent(USER_AGENT)
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    let download_url = format!("{}/download", mod_url.trim_end_matches('/'));
    let response = client
        .get(&download_url)
        .send()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(ManageNgError::Network(format!(
            "Download failed: HTTP {}",
            response.status()
        )));
    }

    let filename = response
        .headers()
        .get("content-disposition")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| {
            s.split("filename=")
                .nth(1)
                .map(|f| f.trim_matches('"').to_string())
        })
        .unwrap_or_else(|| format!("{}.zip", sanitize_filename(&details.title)));

    let dest = dest_dir.join(&filename);
    let bytes = response
        .bytes()
        .map_err(|e| ManageNgError::Network(e.to_string()))?;
    std::fs::write(&dest, &bytes)?;

    Ok(dest)
}

fn parse_resource_listing(html: &str) -> Result<Vec<RepoMod>> {
    let document = Html::parse_document(html);
    let item_sel = Selector::parse(".resourceList-item").ok();
    let title_sel = Selector::parse(".resourceList-item-title a").ok();
    let author_sel = Selector::parse(".resourceList-item-author a").ok();
    let desc_sel = Selector::parse(".resourceList-item-description").ok();
    let thumb_sel = Selector::parse(".resourceList-item-image img").ok();

    let mut mods = Vec::new();

    if let (Some(item_sel), Some(title_sel)) = (item_sel, title_sel) {
        for item in document.select(&item_sel) {
            let title_el = item.select(&title_sel).next();
            let Some(title_el) = title_el else { continue };

            let title = title_el.text().collect::<String>().trim().to_string();
            let href = title_el.value().attr("href").unwrap_or("").to_string();
            let url = if href.starts_with("http") {
                href.clone()
            } else {
                format!("https://www.beamng.com{}", href)
            };

            let id = extract_resource_id(&url).unwrap_or_else(|| title.clone());

            let author = author_sel
                .as_ref()
                .and_then(|s| item.select(s).next())
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "Unknown".into());

            let description = desc_sel
                .as_ref()
                .and_then(|s| item.select(s).next())
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            let thumbnail_url = thumb_sel
                .as_ref()
                .and_then(|s| item.select(s).next())
                .and_then(|el| el.value().attr("src"))
                .map(|s| {
                    if s.starts_with("http") {
                        s.to_string()
                    } else {
                        format!("https://www.beamng.com{}", s)
                    }
                });

            mods.push(RepoMod {
                id,
                title,
                author,
                description,
                category: "General".into(),
                rating: None,
                downloads: None,
                url,
                thumbnail_url,
                update_date: None,
            });
        }
    }

    if mods.is_empty() {
        mods = parse_fallback_listing(html);
    }

    Ok(mods)
}

fn parse_fallback_listing(html: &str) -> Vec<RepoMod> {
    let re = Regex::new(r#"/resources/[^"]+\.(\d+)/?"#).ok();
    let title_re = Regex::new(r#"<a[^>]+href="(/resources/[^"]+)"[^>]*>([^<]+)</a>"#).ok();

    let mut mods = Vec::new();
    if let (Some(re), Some(title_re)) = (re, title_re) {
        for cap in title_re.captures_iter(html) {
            let href = cap.get(1).map(|m| m.as_str()).unwrap_or("");
            let title = cap.get(2).map(|m| m.as_str()).unwrap_or("Unknown").trim();
            if re.is_match(href) && !title.is_empty() {
                let url = format!("https://www.beamng.com{}", href);
                let id = extract_resource_id(&url).unwrap_or_else(|| title.to_string());
                mods.push(RepoMod {
                    id,
                    title: title.to_string(),
                    author: "Unknown".into(),
                    description: String::new(),
                    category: "General".into(),
                    rating: None,
                    downloads: None,
                    url,
                    thumbnail_url: None,
                    update_date: None,
                });
            }
        }
    }
    mods.dedup_by(|a, b| a.url == b.url);
    mods
}

fn parse_resource_detail(html: &str, url: &str) -> Result<RepoMod> {
    let document = Html::parse_document(html);
    let title_sel = Selector::parse("h1").ok();
    let desc_sel = Selector::parse(".resourceDescription").ok();
    let author_sel = Selector::parse(".author a").ok();

    let title = title_sel
        .and_then(|s| document.select(&s).next())
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| "Unknown Mod".into());

    let description = desc_sel
        .and_then(|s| document.select(&s).next())
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_default();

    let author = author_sel
        .and_then(|s| document.select(&s).next())
        .map(|el| el.text().collect::<String>().trim().to_string())
        .unwrap_or_else(|| "Unknown".into());

    let id = extract_resource_id(url).unwrap_or_else(|| title.clone());

    Ok(RepoMod {
        id,
        title,
        author,
        description,
        category: "General".into(),
        rating: None,
        downloads: None,
        url: url.to_string(),
        thumbnail_url: None,
        update_date: None,
    })
}

fn extract_resource_id(url: &str) -> Option<String> {
    let re = Regex::new(r"\.(\d+)/?$").ok()?;
    re.captures(url)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if r#"<>:"/\|?*"#.contains(c) { '_' } else { c })
        .collect::<String>()
        .replace(' ', "_")
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => "+".into(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}
