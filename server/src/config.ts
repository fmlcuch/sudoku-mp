export const config = {
  port: Number(process.env.PORT || 3001),
  wsOrigin: process.env.WS_ORIGIN || 'http://localhost:5173',
};
