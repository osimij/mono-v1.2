import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Menu, Moon, Sun, LogOut, Shield, User, Settings, Sparkles, Brain } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
  description?: string;
  isProMode?: boolean;
  onModeToggle?: () => void;
}

export function Header({ onMenuToggle, title, description, isProMode, onModeToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const { user, logout, isLogoutLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-border/60 bg-surface-elevated/80 backdrop-blur-xl transition-[left] lg-left-sidebar">
      <div className="grid h-full grid-cols-[1fr,_auto] items-center gap-6 px-6">
        {/* Left section - Menu button and title */}
        <div className="flex h-full items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {title && (
            <div className="hidden h-full items-center gap-3 sm:flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className="cursor-help text-xl font-semibold text-text-primary">
                      {title}
                    </h1>
                  </TooltipTrigger>
                  {description && (
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-sm">{description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        
        {/* Right section - Theme, mode toggle, and profile */}
        <div className="flex h-full items-center justify-end gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative text-text-muted hover:text-text-primary"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {onModeToggle && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onModeToggle}
                    className="relative text-text-muted hover:text-text-primary"
                  >
                    {isProMode ? (
                      <Sparkles className="h-5 w-5 text-warning" />
                    ) : (
                      <Brain className="h-5 w-5 text-primary" />
                    )}
                    <span className="sr-only">Toggle mode</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Switch to {isProMode ? "Light" : "Pro"} Mode</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {!user ? (
            // Not logged in - show login buttons
            <div className="flex items-center gap-2">
              <Link href="/admin-login">
                <Button variant="ghost" size="sm" className="text-warning hover:text-warning">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="default" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (
            // Logged in - show user menu
            <div className="flex items-center gap-4">
              {user?.isAdmin && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="text-warning hover:text-warning">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-surface-muted/60 p-0 hover:bg-surface-muted">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                      <AvatarFallback>
                        {user?.firstName?.[0] || "U"}{user?.lastName?.[0] || ""}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs leading-none text-text-muted">
                        {user?.email}
                      </p>
                      {user?.isAdmin && (
                        <Badge variant="secondary" className="text-xs w-fit mt-1">
                          Administrator
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} disabled={isLogoutLoading}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLogoutLoading ? "Logging out..." : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
