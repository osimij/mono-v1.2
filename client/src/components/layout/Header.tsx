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
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-30">
      <div className="h-full px-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px' }}>
        {/* Left section - Menu button and title */}
        <div className="flex items-center space-x-4 h-full">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          {title && (
            <div className="flex items-center space-x-3 hidden sm:flex h-full">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white cursor-help">
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
        <div className="flex items-center justify-end space-x-4 h-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
                    className="relative"
                  >
                    {isProMode ? (
                      <Sparkles className="h-5 w-5 text-orange-600" />
                    ) : (
                      <Brain className="h-5 w-5 text-blue-600" />
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
            <div className="flex items-center space-x-2">
              <Link href="/admin-login">
                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
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
            <div className="flex items-center space-x-4">
              {user?.isAdmin && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
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
                      <p className="text-xs leading-none text-muted-foreground">
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
