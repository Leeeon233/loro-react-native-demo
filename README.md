# Loro React Native Demo

<p align="center">
  <a aria-label="X" href="https://x.com/loro_dev" target="_blank">
    <img alt="" src="https://img.shields.io/badge/Twitter-black?style=for-the-badge&logo=Twitter">
  </a>
  <a aria-label="Discord-Link" href="https://discord.gg/tUsBSVfqzf" target="_blank">
    <img alt="" src="https://img.shields.io/badge/Discord-black?style=for-the-badge&logo=discord">
  </a>
</p>

A collaborative real-time text editor built with [Loro](https://loro.dev) and React Native, demonstrating the power of Conflict-free Replicated Data Types (CRDTs) for seamless multi-user collaboration.

## 🏗️ Architecture

This demo showcases a complete collaborative editing solution:

- **Frontend**: React Native app using [loro-react-native](https://github.com/loro-dev/loro-react-native)
- **Backend**: Node.js WebSocket server for real-time synchronization
- **CRDT Engine**: Loro for conflict-free collaborative editing
- **Ephemeral Store**: Handles temporary data like cursor positions

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- React Native development environment
- iOS Simulator or Android Emulator
- Xcode (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LoroReactNativeDemo
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Install iOS dependencies** (iOS only)
   ```bash
   cd ios && pod install && cd ..
   ```

### Running the Application

1. **Start the WebSocket server**
   ```bash
   npm run server
   ```
   The server will start on port 30026.

2. **Start the React Native Metro bundler**
   ```bash
   npm start
   ```

3. **Run on your preferred platform**
   
   For iOS:
   ```bash
   npm run ios
   ```
   
   For Android:
   ```bash
   npm run android
   ```

## 🔗 Related Links

- [Loro Documentation](https://loro.dev)
- [React Native Documentation](https://reactnative.dev)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
