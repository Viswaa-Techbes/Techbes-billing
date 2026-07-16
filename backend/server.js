const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const errorHandler = require('./src/middleware/errorHandler');

const authRoutes = require('./src/routes/authRoutes');
const businessRoutes = require('./src/routes/businessRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const documentRoutes = require('./src/routes/documentRoutes');
const importRoutes = require('./src/routes/importRoutes');
const paymentReceiptRoutes = require('./src/routes/paymentReceiptRoutes');
const itemRoutes = require('./src/routes/itemRoutes');

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/payment-receipts', paymentReceiptRoutes);
app.use('/api/items', itemRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'TechBes Billing API is running.' });
});

// Error Handler
app.use(errorHandler);

// Start server
const PORT = env.port;
app.listen(PORT, () => {
  console.log(`Server running in ${env.nodeEnv} mode on port ${PORT}`);
});