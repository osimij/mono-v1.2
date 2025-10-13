import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Settings, PanelLeft, PanelLeftClose, LogIn, LogOut, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (value: number) => void;
}

// Import SVG icons from Figma
const iconHome = "/assets/fbf11a828979a0f5ab7cc2d3618ba684103cae34.svg";
const iconDataFactory = "/assets/78a36aff6d4720f573e284e2a794fc73c1eb9847.svg";
const iconFilter = "/assets/ea2be67c030c5b34db5eec6069c619cc98cf498a.svg";
const iconAnalytics = "/assets/2980d4ff623ec9278ab141f87addace63b55ebad.svg";
const iconML = "/assets/78c243b3c535f50bfccfa356d32ae948b47f9e42.svg";
const iconAssistant = "/assets/3cea8c5b533f0411382a7d37879db8b8035a6df5.svg";

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavigationItem[] = [
  { 
    name: "Home", 
    href: "/", 
    icon: iconHome
  },
  { 
    name: "Data Factory", 
    href: "/data", 
    icon: iconDataFactory
  },
  { 
    name: "Segmentation / Filtering", 
    href: "/segmentation", 
    icon: iconFilter
  },
  { 
    name: "Analysis", 
    href: "/analysis", 
    icon: iconAnalytics
  },
  { 
    name: "ML Modling", 
    href: "/modeling", 
    icon: iconML
  },
  { 
    name: "Assistant", 
    href: "/assistant", 
    icon: iconAssistant
  }
];

export function Sidebar({ isOpen, onClose, width, onWidthChange }: SidebarProps) {
  const [location] = useLocation();
  const [isResizing, setIsResizing] = useState(false);
  const { user, logout, isLogoutLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      event.preventDefault();
      const nextWidth = Math.min(Math.max(event.clientX, 240), 360);
      onWidthChange(nextWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseleave", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border transition-transform duration-300",
          "bg-sidebar-background",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width }}
        role="complementary"
        aria-label="Main navigation sidebar"
      >
        {/* Content wrapper with padding */}
        <div className="flex h-full flex-col justify-between px-2 py-2">
          {/* Top section */}
          <div className="flex flex-col">
            {/* Logo and buttons */}
            <div className="flex h-14 items-center justify-between px-2 mb-1">
              <p className="font-['SF_Compact_Display',_sans-serif] text-[20px] font-semibold text-sidebar-foreground">
                MONO
              </p>
              <div className="flex items-center gap-1">
                {/* Desktop collapse button */}
                <button
                  onClick={onClose}
                  className="hidden lg:flex h-8 w-8 items-center justify-center rounded-[9px] hover:bg-[#1d1d1f] transition-colors"
                  aria-label="Toggle sidebar"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-5 w-5 text-sidebar-foreground/60" />
                </button>
                {/* Mobile close button */}
                <button
                  onClick={onClose}
                  className="lg:hidden flex h-8 w-8 items-center justify-center rounded-[9px] hover:bg-[#1d1d1f] transition-colors"
                  aria-label="Close sidebar"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="text-sidebar-foreground/60">
                    <path d="M14.2548 4.75488C14.5282 4.48152 14.9717 4.48152 15.2451 4.75488C15.5184 5.02825 15.5184 5.47175 15.2451 5.74512L10.9902 10L15.2451 14.2549L15.3349 14.3652C15.514 14.6369 15.4841 15.006 15.2451 15.2451C15.006 15.4842 14.6368 15.5141 14.3652 15.335L14.2548 15.2451L9.99995 10.9902L5.74506 15.2451C5.4717 15.5185 5.0282 15.5185 4.75483 15.2451C4.48146 14.9718 4.48146 14.5282 4.75483 14.2549L9.00971 10L4.75483 5.74512L4.66499 5.63477C4.48589 5.3631 4.51575 4.99396 4.75483 4.75488C4.99391 4.51581 5.36305 4.48594 5.63471 4.66504L5.74506 4.75488L9.99995 9.00977L14.2548 4.75488Z"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Main Links */}
            <div className="flex flex-col gap-1 px-2 py-2">
              {navigation.map((item) => {
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start hover:bg-[#1d1d1f]",
                        isActive && "bg-[#1d1d1f]"
                      )}
                    >
                      <div className="h-4 w-4 shrink-0 flex items-center justify-center mr-2">
                        {item.name === "Data Factory" ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" className="opacity-80">
                            <path d="M13.6903 19.4567C13.5 18.9973 13.5 18.4149 13.5 17.25C13.5 16.0851 13.5 15.5027 13.6903 15.0433C13.944 14.4307 14.4307 13.944 15.0433 13.6903C15.5027 13.5 16.0851 13.5 17.25 13.5C18.4149 13.5 18.9973 13.5 19.4567 13.6903C20.0693 13.944 20.556 14.4307 20.8097 15.0433C21 15.5027 21 16.0851 21 17.25C21 18.4149 21 18.9973 20.8097 19.4567C20.556 20.0693 20.0693 20.556 19.4567 20.8097C18.9973 21 18.4149 21 17.25 21C16.0851 21 15.5027 21 15.0433 20.8097C14.4307 20.556 13.944 20.0693 13.6903 19.4567Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"/>
                            <path d="M13.6903 8.95671C13.5 8.49728 13.5 7.91485 13.5 6.75C13.5 5.58515 13.5 5.00272 13.6903 4.54329C13.944 3.93072 14.4307 3.44404 15.0433 3.1903C15.5027 3 16.0851 3 17.25 3C18.4149 3 18.9973 3 19.4567 3.1903C20.0693 3.44404 20.556 3.93072 20.8097 4.54329C21 5.00272 21 5.58515 21 6.75C21 7.91485 21 8.49728 20.8097 8.95671C20.556 9.56928 20.0693 10.056 19.4567 10.3097C18.9973 10.5 18.4149 10.5 17.25 10.5C16.0851 10.5 15.5027 10.5 15.0433 10.3097C14.4307 10.056 13.944 9.56928 13.6903 8.95671Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"/>
                            <path d="M3.1903 19.4567C3 18.9973 3 18.4149 3 17.25C3 16.0851 3 15.5027 3.1903 15.0433C3.44404 14.4307 3.93072 13.944 4.54329 13.6903C5.00272 13.5 5.58515 13.5 6.75 13.5C7.91485 13.5 8.49728 13.5 8.95671 13.6903C9.56928 13.944 10.056 14.4307 10.3097 15.0433C10.5 15.5027 10.5 16.0851 10.5 17.25C10.5 18.4149 10.5 18.9973 10.3097 19.4567C10.056 20.0693 9.56928 20.556 8.95671 20.8097C8.49728 21 7.91485 21 6.75 21C5.58515 21 5.00272 21 4.54329 20.8097C3.93072 20.556 3.44404 20.0693 3.1903 19.4567Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"/>
                            <path d="M3.1903 8.95671C3 8.49728 3 7.91485 3 6.75C3 5.58515 3 5.00272 3.1903 4.54329C3.44404 3.93072 3.93072 3.44404 4.54329 3.1903C5.00272 3 5.58515 3 6.75 3C7.91485 3 8.49728 3 8.95671 3.1903C9.56928 3.44404 10.056 3.93072 10.3097 4.54329C10.5 5.00272 10.5 5.58515 10.5 6.75C10.5 7.91485 10.5 8.49728 10.3097 8.95671C10.056 9.56928 9.56928 10.056 8.95671 10.3097C8.49728 10.5 7.91485 10.5 6.75 10.5C5.58515 10.5 5.00272 10.5 4.54329 10.3097C3.93072 10.056 3.44404 9.56928 3.1903 8.95671Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <img 
                            alt="" 
                            className="block h-full w-full opacity-80 dark:invert dark:brightness-0 dark:contrast-200" 
                            src={item.icon} 
                          />
                        )}
                      </div>
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Bottom section - Auth and Settings */}
          <div className="flex flex-col gap-1 px-2 pb-1">
            {/* Authentication Section */}
            {!user ? (
              // Not logged in - show login buttons
              <>
                <Link href="/admin-login">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-warning hover:text-warning hover:bg-[#1d1d1f]">
                    <Shield className="h-4 w-4 mr-2" />
                    Admin Login
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              </>
            ) : (
              // Logged in - show user menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start h-auto py-2 hover:bg-[#1d1d1f]">
                    <div className="flex items-center gap-2.5 w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "User"} />
                        <AvatarFallback className="text-xs">
                          {user?.firstName?.[0] || "U"}{user?.lastName?.[0] || ""}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="font-medium text-sidebar-foreground truncate">
                          {user?.firstName} {user?.lastName}
                        </span>
                        {user?.isAdmin && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>
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
                  {user?.isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} disabled={isLogoutLoading}>
                    <LogOut className="mr-2 h-4 w-4" />
                    {isLogoutLoading ? "Logging out..." : "Log out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Settings Link */}
            <Link href="/settings">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "w-full justify-start hover:bg-[#1d1d1f]",
                  location === "/settings" && "bg-[#1d1d1f]"
                )}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Resize handle */}
      <div
        className="fixed top-0 hidden h-full w-1 cursor-col-resize select-none lg:block group z-50 hover:bg-[#1d1d1f] transition-colors"
        style={{ left: `${width}px` }}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          setIsResizing(true);
        }}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors",
            isResizing ? "bg-sidebar-accent/50" : "bg-transparent"
          )}
        />
      </div>
    </>
  );
}
