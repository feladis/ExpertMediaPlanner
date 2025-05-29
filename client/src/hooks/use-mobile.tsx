import * as React from "react"

// Simplified mobile detection hook
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    const mql = window.matchMedia("(max-width: 767px)")
    
    checkMobile()
    mql.addEventListener("change", checkMobile)
    return () => mql.removeEventListener("change", checkMobile)
  }, [])

  return isMobile
}
