# 📦 StockWise – Smart Inventory & Stockout Prevention System

**StockWise** is a smart inventory management system designed to help businesses manage stock efficiently, monitor inventory levels, visualize warehouse operations, and prevent stockouts through intelligent restocking recommendations.

The platform combines a modern dashboard with data structures and algorithms to make inventory operations faster, more organized, and data-driven.

---

## 🚀 Project Overview

Managing inventory manually can lead to stock shortages, overstocking, inefficient warehouse allocation, and poor decision-making.

StockWise addresses these challenges through a centralized inventory management platform that provides real-time stock tracking, warehouse management, sales and purchase operations, analytics, and restocking priorities.

## ✨ Key Features

### 1. Inventory Management
- Add, update, view, and delete products.
- Track product quantities and stock information.
- Search and manage inventory efficiently.
- Monitor low-stock products.

### 2. Smart Restocking System
- Automatically prioritize products requiring replenishment.
- Identify low-stock items.
- Generate restocking recommendations using a Priority Queue (Min Heap).

### 3. 3D Warehouse Visualization
- Interactive warehouse visualization.
- View warehouse racks and shelves.
- Monitor product allocation across storage locations.
- Manage racks, shelves, and inventory allocation.

### 4. Purchase & Sales Management
- Record incoming stock purchases.
- Process stock sales.
- Automatically update inventory quantities.
- Maintain stock transaction records.

### 5. Stock Intelligence & Analytics
- Monitor inventory performance.
- View stock-related insights.
- Analyze inventory movements.
- Generate monthly stock reports.

### 6. Inventory Assistant
- Integrated rule-based inventory assistant.
- Helps users access inventory-related information and guidance.

### 7. Authentication & Security
- User login and authentication.
- Role-based access control.
- Admin-only warehouse management operations.
- Protected backend endpoints.

---

## 🧠 Data Structures & Algorithms

StockWise integrates fundamental Data Structures and Algorithms to improve performance and demonstrate practical DSA applications.

| Data Structure / Algorithm | Application |
|---|---|
| Min Heap / Priority Queue | Prioritizing products for restocking |
| Trie | Efficient prefix-based product search |
| HashMap | Fast product lookup using SKU |
| Segment Tree | Efficient range-based stock quantity queries |

These implementations connect core computer science concepts with real-world inventory management problems.

---

## 🛠️ Technology Stack

**Frontend**
- React.js
- JavaScript
- HTML5
- CSS3
- Vite

**Backend**
- Java
- Spring Boot
- Spring Security
- REST APIs

**Database**
- MySQL

**Tools & Development**
- Visual Studio Code
- IntelliJ IDEA
- Git
- GitHub
- MySQL Workbench
- Maven
- npm

---

## 🏗️ Project Architecture

```text
StockWise/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/stockwise/backend/
│   │   │   └── resources/
│   │   └── test/
│   └── pom.xml
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── Warehouse3D.jsx
│   │   └── InventoryAssistant.jsx
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

Make sure you have installed:

- Java 21 or compatible configured JDK
- Node.js and npm
- MySQL Server
- Maven

### 1. Clone the Repository

```bash
git clone https://github.com/saraadesh mukh13/Stockwise.git
cd Stockwise
```

Use the exact HTTPS clone URL from the GitHub **Code** button.

### 2. Configure the Database

- Start your MySQL server.
- Create the database required by your application.
- Configure your database URL, username, and password in your local backend configuration.
- Keep database credentials private. Do not commit passwords or secret keys to GitHub.

### 3. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

### 4. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

---

## 🔐 Security

StockWise incorporates authentication and authorization mechanisms to protect inventory operations.

- Authenticated access to protected resources.
- Role-based permissions.
- Restricted administrative operations.
- Secure handling of application configuration and database credentials.

---

## 👥 Project Contributors

| Name / GitHub Username | Role |
|---|---|
| Sara Deshmukh – [@saraadesh mukh13](https://github.com/saraadesh mukh13) | Project Developer |
| Raghav Kaushik – [@Raghavkaushik311](https://github.com/Raghavkaushik311) | Contributor |
| [@seh4835](https://github.com/seh4835) | Contributor |

---

## 🎯 Project Objective

The primary objective of StockWise is to demonstrate how data structures, algorithms, full-stack development, and database management can be integrated to solve practical inventory management challenges.

By combining inventory tracking, warehouse visualization, analytics, and intelligent restocking priorities, StockWise aims to make stock management more efficient and reliable.

---

## 📌 Future Enhancements

- Machine learning-based demand forecasting.
- Automated purchase order generation.
- Advanced inventory analytics.
- Multi-warehouse support.
- Enhanced reporting and business intelligence.

---

**Built with ❤️ using Java, Spring Boot, React, MySQL, and Data Structures & Algorithms.**
