pub mod connection;
pub mod preferences;
pub mod repositories;

use std::sync::Mutex;

pub use connection::open;

pub struct DbState {
    pub conn: Mutex<rusqlite::Connection>,
}
