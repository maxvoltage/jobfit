import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <Tabs value={theme} onValueChange={setTheme} className="w-auto">
            <TabsList className="grid grid-cols-3 h-9 w-[120px] bg-muted/50 p-1">
                <TabsTrigger value="light" className="px-0 data-[state=active]:bg-background data-[state=active]:text-primary" title="Light Theme">
                    <Sun className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="dark" className="px-0 data-[state=active]:bg-background data-[state=active]:text-primary" title="Dark Theme">
                    <Moon className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="system" className="px-0 data-[state=active]:bg-background data-[state=active]:text-primary" title="System Theme">
                    <Monitor className="h-4 w-4" />
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
