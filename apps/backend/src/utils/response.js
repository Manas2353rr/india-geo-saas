const sendSuccess = (res, data, options = {}) => {
    const { statusCode = 200, count, meta = {} } = options;
    return res.status(statusCode).json({
      success: true,
      count: count !== undefined ? count : Array.isArray(data) ? data.length : undefined,
      data,
      meta: {
        requestId: res.locals.requestId || "req_" + Date.now(),
        responseTime: Date.now() - (res.locals.startTime || Date.now()),
        ...meta,
      },
    });
  };
  
  const sendError = (res, message, options = {}) => {
    const { statusCode = 500, code = "INTERNAL_ERROR" } = options;
    return res.status(statusCode).json({ success: false, error: message, code });
  };
  
  module.exports = { sendSuccess, sendError };