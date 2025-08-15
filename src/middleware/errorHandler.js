const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err);
  
  // Default error structure
  const errorResponse = {
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ...errorResponse,
      message: 'Validation Error',
      details: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json(errorResponse);
  }

  // Default 500 error
  res.status(err.status || 500).json(errorResponse);
};

module.exports = { errorHandler };