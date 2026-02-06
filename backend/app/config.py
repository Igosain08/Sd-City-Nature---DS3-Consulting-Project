"""
Configuration settings for SD City Nature Challenge backend
"""

# San Diego bounding box for spatial filtering
SD_BOUNDING_BOX = {
    "min_lat": 32.5,
    "max_lat": 33.1,
    "min_lng": -117.4,
    "max_lng": -116.8
}

# San Antonio bounding box
SA_BOUNDING_BOX = {
    "min_lat": 29.2,
    "max_lat": 29.7,
    "min_lng": -98.8,
    "max_lng": -98.2
}

# Los Angeles bounding box
LA_BOUNDING_BOX = {
    "min_lat": 33.7,
    "max_lat": 34.3,
    "min_lng": -118.7,
    "max_lng": -118.1
}

# Data directory
DATA_DIR = "data/"

# H3 hexagon resolution (7 = ~5.16 km² per hex)
HEX_RESOLUTION = 7

# API settings
API_PREFIX = "/api"
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
]
