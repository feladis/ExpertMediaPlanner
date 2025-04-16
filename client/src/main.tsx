import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Override the default text color to match the design spec
document.documentElement.style.setProperty('--foreground', '2D3436');

createRoot(document.getElementById("root")!).render(<App />);
