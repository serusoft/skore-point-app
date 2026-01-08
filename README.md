# Skore Point - School Management System

Skore Point is a web-based application designed to help schools manage student marks and generate reports. It is a Progressive Web App (PWA) that can be installed on a user's device and has offline capabilities.

## Technologies Used

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Service Worker:** For offline support and caching
- **Libraries:** Font Awesome for icons

## Project Structure

The project is organized into the following main directories:

-   `assets`: Contains static assets like icons and screenshots.
-   `firebase`: Contains Firebase configuration and service modules.
-   `pages`: Contains the different pages of the application (e.g., dashboard, login, marks).
-   `services`: Contains modules for interacting with Firebase services.
-   `shared`: Contains shared CSS, JavaScript, and UI components.
-   `utils`: Contains utility functions.

## Running the Project Locally

To run the project locally, you can use a simple HTTP server.

**Using Python:**

If you have Python installed, you can run a simple HTTP server from the project's root directory:

```bash
python -m http.server
```

Then, open your browser and go to `http://localhost:8000`.

**Using Node.js:**

If you have Node.js installed, you can use the `serve` package:

```bash
npx serve .
```

Then, open your browser and go to the URL provided by the `serve` command.

You can also simply open the `index.html` file directly in your browser.
