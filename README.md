# Fish Tracker App 🎣

A comprehensive fishing catch tracker application with offline capabilities, real-time weather data, and social features. Built with modern web technologies and designed for anglers who want to log, track, and share their fishing experiences.

![Fish Tracker App](https://via.placeholder.com/800x400/4F46E5/ffffff?text=Fish+Tracker+App)

## Features

### Core Functionality
- **📱 Mobile-First Design**: Optimized for smartphones with Progressive Web App (PWA) support
- **🐟 Catch Logging**: Comprehensive catch tracking with species, size, weight, location, and photos
- **🌍 GPS Integration**: Automatic location detection for precise catch spot recording
- **📷 Photo Support**: Add multiple photos to document your catches
- **📊 Statistics Dashboard**: Personal fishing statistics and progress tracking

### Advanced Features
- **🌤️ Weather Integration**: Real-time weather conditions for optimal fishing planning
- **📱 Offline Mode**: Continue tracking catches without internet connection, sync when connected
- **🏆 Leaderboards**: Community rankings by catch count, species variety, and size
- **🎯 Species Database**: Comprehensive fish species identification and information
- **👥 Social Features**: View and interact with community catches

### Administrative Tools
- **🔧 Admin Dashboard**: User management and system monitoring
- **✅ Catch Verification**: Admin approval system for submitted catches
- **📈 Analytics**: System usage and user engagement metrics

## Technology Stack

- **Frontend**: React 18 with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based with bcrypt password hashing
- **Maps**: Leaflet for interactive mapping
- **Weather**: OpenWeatherMap API integration
- **Deployment**: Docker with Docker Compose
- **PWA**: Service Worker for offline functionality

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [OpenWeather API Key](https://openweathermap.org/api) (optional, for weather features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fish-tracker-app.git
   cd fish-tracker-app
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your OpenWeather API key (optional)
   ```

3. **Start the application**
   ```bash
   # Quick start with script
   ./start.sh
   
   # Or manually
   docker-compose up -d
   ```

4. **Access the application**
   - Web Interface: http://localhost:5000
   - Default Admin: admin@example.com / password123

## Project Structure

```
fish-tracker-app/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Node.js backend application
│   ├── routes.ts          # API route definitions
│   ├── storage.ts         # Database operations
│   └── services/          # External service integrations
├── shared/                # Shared TypeScript types and schemas
├── docker-compose.yml     # Docker orchestration
├── Dockerfile            # Application container definition
└── README-Docker.md      # Detailed deployment guide
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - User logout

### Catches
- `GET /api/catches` - List all catches (public)
- `POST /api/catches` - Create new catch (authenticated)
- `GET /api/catches/:id` - Get specific catch
- `PUT /api/catches/:id` - Update catch (owner/admin)
- `DELETE /api/catches/:id` - Delete catch (owner/admin)

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/stats` - Get user statistics
- `GET /api/users/:id/catches` - Get user's catches

### Weather
- `GET /api/weather` - Get weather data for coordinates

## Development

### Local Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up development database**
   ```bash
   # Start PostgreSQL container
   docker-compose up -d db
   
   # Run migrations
   npm run db:push
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio (database GUI)

### Code Quality

- **TypeScript**: Full type safety across frontend and backend
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

## Deployment

### Docker Deployment (Recommended)

See [README-Docker.md](./README-Docker.md) for comprehensive Docker deployment instructions.

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set up PostgreSQL database**
   - Create database: `fishtracker`
   - Update `DATABASE_URL` environment variable

3. **Run migrations**
   ```bash
   npm run db:push
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fishtracker

# Session Security
SESSION_SECRET=your-secure-session-secret

# Weather API (Optional)
OPENWEATHER_API_KEY=your-openweather-api-key

# Application
NODE_ENV=production
PORT=5000
```

### Database Schema

The application uses Drizzle ORM with PostgreSQL. Key tables:

- `users` - User accounts and profiles
- `catches` - Fishing catch records
- `lakes` - Fishing location data
- `likes` - User interactions with catches
- `comments` - User comments on catches
- `sessions` - User session storage

## Contributing

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests if applicable**
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Use existing component patterns and styling
- Write descriptive commit messages
- Test your changes thoroughly
- Update documentation as needed

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check [README-Docker.md](./README-Docker.md) for deployment details
- **Issues**: Report bugs or request features via GitHub Issues
- **API Keys**: Get your free OpenWeather API key at [openweathermap.org](https://openweathermap.org/api)

## Roadmap

- [ ] Real-time chat for fishing communities
- [ ] Advanced catch analytics and insights
- [ ] Integration with fishing gear databases
- [ ] Social media sharing capabilities
- [ ] Mobile app development (React Native)
- [ ] AI-powered fish species identification
- [ ] Tournament and competition features

---

Built with ❤️ by the fishing community, for the fishing community.