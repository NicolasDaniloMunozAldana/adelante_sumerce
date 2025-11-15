# Database Consumer Worker

A pure Node.js service that provides fault-tolerant database write operations through Kafka message processing.

## Purpose

This worker service processes database write operations from a Kafka queue, providing:
- **Fault tolerance**: Continues accepting writes when database is down
- **Automatic recovery**: Processes queued operations when database recovers
- **Cache synchronization**: Keeps Redis cache in sync with database
- **Retry logic**: Automatically retries failed operations with exponential backoff

## Architecture

```
Kafka Topic: db-operations-buffer
        ↓
  Database Consumer
        ↓
   ┌─────────┴─────────┐
   ↓                   ↓
Database            Redis Cache
(MySQL)             (Sync)
```

## Features

### 1. Database Health Monitoring
- Continuous health checks every 10 seconds
- Automatic reconnection attempts
- Status notifications for health changes

### 2. Operation Processing
- Supports CREATE, UPDATE, DELETE, BULK_CREATE, BULK_UPDATE operations
- Processes all Sequelize models
- Automatic retry with exponential backoff (up to 5 attempts)

### 3. Cache Synchronization
- Updates Redis after successful database writes
- Invalidates stale cache entries
- Maintains consistency between database and cache

### 4. Resilience
- Queues operations when database is down
- Processes backlog when database recovers
- Dead letter queue for failed operations

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=adelante_sumerce

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=database-consumer
KAFKA_GROUP_ID=database-writer-group
TOPIC_DB_OPERATIONS=db-operations-buffer

# Consumer Configuration
CONSUMER_SESSION_TIMEOUT=30000
CONSUMER_HEARTBEAT_INTERVAL=3000
MAX_RETRY_ATTEMPTS=5
RETRY_DELAY_MS=5000

# Database Health Check
DB_HEALTH_CHECK_INTERVAL=10000
DB_RECONNECT_INTERVAL=5000

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Operation Format

Operations received from Kafka should follow this format:

```javascript
{
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_CREATE' | 'BULK_UPDATE',
  entity: 'Business' | 'User' | 'Finance' | ...,
  data: {
    // Entity-specific data
  },
  metadata: {
    operationId: 'op_1234567890_abc',
    timestamp: 1699876543210,
    userId: 123,
    source: 'adelante-sumerce',
    action: 'create_business'
  }
}
```

## Supported Entities

All Sequelize models from the main application:
- Business
- User
- Finance
- BusinessModel
- WorkTeam
- Rating
- SocialEnvironmentalImpact

## Monitoring

### Status Logs
The worker logs its status every minute:

```
📊 Worker Status: {
  consumer: {
    isRunning: true,
    processingPaused: false,
    pendingOperations: 0,
    databaseHealthy: true
  },
  database: {
    isHealthy: true,
    lastHealthCheck: '2024-11-14T10:30:00.000Z',
    uptime: 3600
  },
  redis: true
}
```

### Key Log Messages

- ✅ `Kafka Consumer connected` - Consumer started successfully
- 📡 `Subscribed to topic: db-operations-buffer` - Listening for operations
- 📩 `Received operation from Kafka` - New operation received
- ✅ `Operation processed successfully` - Operation completed
- ❌ `Database is now UNHEALTHY` - Database connection lost
- ✅ `Database is now HEALTHY` - Database connection restored
- 🔄 `Processing N pending operations` - Processing backlog

## Error Handling

### Retry Logic
- Failed operations are automatically retried up to 5 times
- Exponential backoff between retries (5s, 10s, 20s, 40s, 80s)
- After max retries, operations go to dead letter queue

### Dead Letter Queue
Operations that fail after all retries are logged with full details:
```
DEAD LETTER QUEUE - Operation failed after all retries: {
  operation: {...},
  error: 'error message',
  timestamp: '2024-11-14T10:30:00.000Z',
  stack: '...'
}
```

## Graceful Shutdown

The worker handles shutdown signals gracefully:

```bash
# Send SIGINT (Ctrl+C) or SIGTERM
```

On shutdown, the worker:
1. Stops health monitoring
2. Disconnects Kafka consumer
3. Closes database connection
4. Disconnects Redis

## Project Structure

```
database_consumer/
├── index.js                      # Main entry point
├── package.json
├── .env
├── src/
│   ├── config/
│   │   ├── database.js          # Sequelize configuration
│   │   ├── redis.js             # Redis manager
│   │   ├── logger.js            # Winston logger
│   │   └── healthMonitor.js     # Database health monitoring
│   ├── consumers/
│   │   └── databaseConsumer.js  # Kafka consumer
│   ├── services/
│   │   └── operationProcessor.js # Operation processing logic
│   └── models/
│       └── index.js             # Sequelize models
└── logs/
    ├── combined.log
    └── error.log
```

## Dependencies

- **kafkajs**: Kafka client for consuming messages
- **sequelize**: ORM for database operations
- **mysql2**: MySQL driver
- **redis**: Redis client for cache synchronization
- **winston**: Logging library
- **dotenv**: Environment configuration

## Development

### Adding New Operations

To support new operation types, update `operationProcessor.js`:

```javascript
async process(operation) {
    switch (type) {
        case 'YOUR_NEW_OPERATION':
            result = await this.handleYourNewOperation(entity, data);
            break;
        // ...
    }
}

async handleYourNewOperation(entity, data) {
    // Implementation
}
```

### Adding New Models

Models are automatically loaded from `src/models/index.js`. Ensure new models are exported there.

## Troubleshooting

### Consumer not processing operations
1. Check Kafka is running: `docker-compose ps kafka`
2. Verify topic exists: `kafka-topics.sh --list --bootstrap-server localhost:9092`
3. Check consumer logs for connection errors

### Database operations failing
1. Verify database connection in `.env`
2. Check database is running
3. Review error logs in `logs/error.log`

### Redis sync not working
1. Verify Redis is running
2. Check Redis connection settings
3. Ensure Redis password is correct

## Performance Tuning

Adjust these environment variables for performance:

- `CONSUMER_SESSION_TIMEOUT`: Increase for slower processing
- `MAX_RETRY_ATTEMPTS`: Adjust based on failure tolerance
- `RETRY_DELAY_MS`: Base delay between retries
- `DB_HEALTH_CHECK_INTERVAL`: Frequency of health checks

## Security

- Keep `.env` file secure and never commit it
- Use strong passwords for database and Redis
- Run with minimal required permissions
- Monitor logs for suspicious activity

## License

ISC
