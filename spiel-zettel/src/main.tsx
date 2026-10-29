import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import "./i18n.js";

import { App } from "./app/App.js";
import { NotFound } from "./app/pages/NotFound.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    // Everything will be rendered inside App
    element: <App />,
    children: [
      // Home route
      {
        index: true,
        lazy: async () => {
          const { Home } = await import("./app/pages/Home.jsx");
          return { Component: Home };
        },
      },
      // Spielzettel routes
      {
        path: "spielzettel/:id",
        lazy: async () => {
          const { Spielzettel } = await import("./app/pages/Spielzettel.jsx");
          return { Component: Spielzettel };
        },
        children: [
          // /spielzettel/:id
          { index: true, element: null },
          // /spielzettel/:id/menu
          { path: "menu", element: null },
        ],
      },
      // Catch-all
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
