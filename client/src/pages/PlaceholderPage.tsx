import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: any;
  parentPath: string;
}

export function PlaceholderPage({ title, description, icon: Icon, parentPath }: PlaceholderPageProps) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Icon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Construction className="w-16 h-16 text-gray-400" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature is currently under development and will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            We're working hard to bring you this functionality. Check back soon for updates!
          </p>
          <Link 
            href={parentPath}
            className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {parentPath === "/data" ? "Data Factory" : 
                         parentPath === "/segmentation" ? "Segmentation" :
                         parentPath === "/analysis" ? "Analysis" :
                         parentPath === "/modeling" ? "ML Modeling" :
                         parentPath === "/assistant" ? "AI Assistant" : "Main Page"}</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
