import { Outlet } from "@tanstack/react-router"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

function App() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-card px-3 md:hidden">
            <SidebarTrigger />
            <span className="text-sm font-semibold">Zoko SI</span>
          </header>
          <main className="flex min-h-0 flex-1 flex-col bg-background">
            <Outlet />
          </main>
        </SidebarInset>
        <Toaster theme="light" />
      </SidebarProvider>
    </TooltipProvider>
  )
}

export default App
