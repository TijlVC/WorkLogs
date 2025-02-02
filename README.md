# Worklog Application

Een applicatie om werkuren en taken bij te houden.

## Functionaliteiten
- Registreren en inloggen van gebruikers
- Toevoegen, bewerken en verwijderen van werklogboeken
- Overzicht van gewerkte uren per dag/week/maand
- Exporteren van werklogboeken naar PDF

## Technische Stack
- Frontend: React, TypeScript, Material-UI
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- Authenticatie: JWT

## Structuur
- `/frontend` - React applicatie
- `/backend` - Node.js API
- `/docs` - Projectdocumentatie

## Setup
1. Clone de repository
2. Installeer dependencies:
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. Start de ontwikkelomgeving:
   ```bash
   # Backend
   cd backend
   npm run dev

   # Frontend
   cd ../frontend
   npm start
   ```

## Environment Variables

### Backend (.env)
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/worklog
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
```

## Scripts
- `npm run dev` - Start ontwikkelomgeving
- `npm run build` - Bouw productieversie
- `npm run test` - Voer tests uit
- `npm run lint` - Controleer code styling

## API Endpoints
- `POST /api/auth/register` - Registreer nieuwe gebruiker
- `POST /api/auth/login` - Login gebruiker
- `GET /api/worklogs` - Haal werklogboeken op
- `POST /api/worklogs` - Voeg werklogboek toe
- `PUT /api/worklogs/:id` - Update werklogboek
- `DELETE /api/worklogs/:id` - Verwijder werklogboek