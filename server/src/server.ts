import { app } from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[Newtonite Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
