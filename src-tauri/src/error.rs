use serde::Serialize;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, ManageNgError>;

#[derive(Error, Debug)]
pub enum ManageNgError {
    #[error("Directory not found: {0}")]
    DirNotFound(String),

    #[error("BeamNG user folder could not be found. Launch the game once or set a custom path.")]
    UserFolderNotFound,

    #[error("Mods folder not found at {0}. Launch BeamNG.drive to create it.")]
    ModsFolderNotFound(String),

    #[error("Mod database not found at {0}")]
    DbNotFound(String),

    #[error("Mod '{0}' not found")]
    ModNotFound(String),

    #[error("Profile '{0}' not found")]
    ProfileNotFound(String),

    #[error("Profile '{0}' already exists")]
    ProfileExists(String),

    #[error("Failed to parse BeamNG configuration")]
    ConfigParse,

    #[error("Network error: {0}")]
    Network(String),

    #[error("Invalid archive: {0}")]
    InvalidArchive(String),

    #[error("{0}")]
    Other(String),

    #[error("IO error: {0}")]
    Io(String),

    #[error("JSON error: {0}")]
    Json(String),

    #[error("Zip error: {0}")]
    Zip(String),
}

impl Serialize for ManageNgError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<std::io::Error> for ManageNgError {
    fn from(err: std::io::Error) -> Self {
        ManageNgError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for ManageNgError {
    fn from(err: serde_json::Error) -> Self {
        ManageNgError::Json(err.to_string())
    }
}

impl From<zip::result::ZipError> for ManageNgError {
    fn from(err: zip::result::ZipError) -> Self {
        ManageNgError::Zip(err.to_string())
    }
}
