import { theme as blue } from "./blue"
import { theme as gray } from "./gray"
import { theme as green } from "./green"
import { theme as brown } from "./brown"
import { theme as indigo } from "./indigo"
import { theme as cyan } from "./cyan"
import { theme as darkBlue } from "./darkBlue"  // New theme
import { theme as black } from "./black"      // New theme

const THEMES = {
  gray,
  blue,
  green,
  brown,
  darkBlue,
  black,
  cyan,
  indigo
}

const currentThemeName = "cyan"  // You can change this to any theme name, like "darkBlue" or "cyan"

const currentTheme = THEMES[currentThemeName]

export default currentTheme
