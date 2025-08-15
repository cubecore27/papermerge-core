import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "pmg",  // Set `pmg` as primary color
  colors: {
    pmg: [
      "#A1B7C3",  // lightest shade (light pastel blue-teal)
      "#7C99B0",  // light (soft muted teal)
      "#608290",  // medium light (muted teal)
      "#4C6C7A",  // medium (deeper teal with a slight greenish hue)
      "#395762",  // middle (balanced, starting to feel more saturated)
      "#2F4B54",  // deeper teal (more intensity and richness)
      "#253F48",  // strong (dark and moody teal)
      "#1C323A",  // darker (darker teal with more contrast)
      "#162A30",  // very dark (rich and almost navy teal)
      "#213448"   // darkest (your provided color)
    ]
  }
});
