// Starts a throwaway local MongoDB for development, so you can run the app without touching Atlas.
// Data is deleted when you stop it. Usage: npm run dev:db, then set in .env.local:
//   MONGODB_URI=mongodb://127.0.0.1:27027/
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.env.DEV_DB_PORT || 27027);
const server = await MongoMemoryServer.create({ instance: { port, ip: '127.0.0.1' } });
console.log(`Local practice database running at ${server.getUri()}`);
console.log('Press Ctrl+C to stop. Everything in it is deleted when it stops.');

const stop = async () => {
  await server.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
