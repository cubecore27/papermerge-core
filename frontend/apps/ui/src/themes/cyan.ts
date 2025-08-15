import { createTheme } from "@mantine/core"

export const theme = createTheme({
  primaryColor: "pmg",  // Key should match the color name in colors object
  colors: {
    pmg: [
      "#e0f7f9", 
      "#b3e6eb", 
      "#80d5de", 
      "#4db5c3", 
      "#1f94a1", 
      "#008c8c",  // main cyan
      "#007a7a", 
      "#006060", 
      "#004c4c", 
      "#003434"   // darkest cyan
    ]
  }
})
