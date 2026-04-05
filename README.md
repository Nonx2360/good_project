# 🛠️ MachineTrack

**MachineTrack** is a professional, high-performance desktop application designed for real-time tracking and management of industrial machine parts. Built with a focus on reliability and ease of use, it helps maintenance teams prevent downtime by monitoring part lifespans and providing automated alerts.

---

## ✨ Key Features

- **📊 Dynamic Dashboard**: A premium, real-time overview of your entire inventory, featuring live countdown timers for active parts.
- **📦 Inventory Management**: full CRUD support for machine parts with detailed tracking of serial numbers, quantities, and activation states.
- **⏳ Real-time Expiry Tracking**: Intelligent status monitoring that highlights parts that are "In Stock", "Active", "Expiring Soon", or "Expired".
- **🔍 Advanced Search & Filtering**: Lightning-fast search with multi-criteria filtering and sorting to find parts in seconds.
- **🌍 Multi-language Support**: Fully localized in **English** and **Thai**, with professional, workshop-appropriate translations.
- **🔔 Discord Integration**: Automated notifications via Discord OAuth2 to alert your team before parts expire.
- **📑 Excel Suite**: Effortlessly import and export your inventory data in Excel format.
- **🌓 Adaptive Theme**: Sleek dark and light mode support that respects your system preferences.

---

## 🚀 Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Backend API**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- **Database**: [SQLite3](https://sqlite.org/) (Local file-based storage)
- **Desktop Container**: [Electron](https://www.electronjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

---

## 🛠️ Development & Build

This project is organized into three main components: `/client`, `/server`, and `/desktop`.

### 1. Client (Frontend)
```bash
cd client
npm install
npm run dev
```

### 2. Server (Backend)
```bash
cd server
npm install
npm run start
```

### 3. Build for Production (.exe)
To package the application into a portable Windows executable:

1. **Build Client**:
   ```bash
   cd client
   npm run build
   ```
2. **Deploy to Desktop folder**:
   Copy the `client/dist` contents to `desktop/client-dist`.
3. **Build Desktop**:
   ```bash
   cd desktop
   npm install
   npm run build
   ```

The portable executable will be generated in the `desktop/dist/` directory.

---

## 📄 License
This project is licensed under the [ISC License](LICENSE).

---
Made with 🏢 for professional workshop management.