import { createTheme } from "@mantine/core"

export const theme = createTheme({
  primaryColor: "pmg",  // This will be the key in the colors objects
  colors: {
    pmg: [
      "#e0e7ff",  // lightest shade
      "#b3c7ff",
      "#7f9eff",
      "#4b75ff",
      "#1e4bff",  // strong
      "#003aff",  // main color
      "#0030e6",
      "#0028c0",
      "#001f99",
      "#00176b"
    ]
  }
})
