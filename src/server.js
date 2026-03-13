import app from './app.js';
import db from './database/index.js';
import env from './config/env.js';

async function start() {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();