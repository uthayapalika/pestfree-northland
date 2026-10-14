class ServiceError(Exception):
    """Business-rule error. main.py turns it into a clean JSON response."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)
