import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "pmg",  // Key should match the color name in colors object
  colors: {
    pmg: [
      "#f0f0f0",  // lightest gray
      "#d0d0d0", 
      "#a0a0a0", 
      "#808080", 
      "#505050",  // medium gray
      "#333333",  // dark gray
      "#2c2c2c",  // darker gray
      "#1a1a1a", 
      "#121212", 
      "#0a0a0a"   // darkest gray (near black)
    ]
  }
});
