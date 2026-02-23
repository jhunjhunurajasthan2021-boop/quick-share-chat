import { UploadZone } from "@/components/UploadZone";
import { PairingSystem } from "@/components/PairingSystem";
import { Shield, Zap, Clock, Smartphone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoImg from "@assets/ChatGPT_Image_Feb_22,_2026,_12_02_11_PM_1771820544101.png";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="PrivLink Logo" className="w-10 h-10 object-contain" />
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-500 font-display">
            PrivLink
          </span>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 mt-16 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 text-center space-y-6 max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Secure Temporary File Sharing
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground font-display">
            PrivLink: <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Secure & Private.
            </span>
          </h1>
        </div>

        {/* Interaction Tabs */}
        <div className="w-full max-w-4xl relative z-20">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mx-auto mb-8 h-12 p-1 bg-white/50 backdrop-blur-sm border border-border rounded-full">
              <TabsTrigger value="upload" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Quick Upload
              </TabsTrigger>
              <TabsTrigger value="pair" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Pair Device
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-0">
              <UploadZone />
            </TabsContent>
            
            <TabsContent value="pair" className="mt-0">
              <PairingSystem />
            </TabsContent>
          </Tabs>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
          <FeatureCard 
            icon={<Clock className="w-6 h-6 text-orange-500" />}
            title="Auto-Expiry"
            description="Files are permanently deleted after 2 hours. No digital footprint left behind."
          />
          <FeatureCard 
            icon={<Shield className="w-6 h-6 text-green-500" />}
            title="Secure Storage"
            description="Enterprise-grade encryption for your files while they are stored."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-blue-500" />}
            title="Lightning Fast"
            description="Powered by high-speed global CDN for instant uploads and downloads."
          />
        </div>
      </div>
      
      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={logoImg} alt="PrivLink Logo" className="w-6 h-6 object-contain opacity-50" />
          <span className="font-bold opacity-50">PrivLink</span>
        </div>
        <p className="mb-2">User is responsible for uploaded content.</p>
        <p>© {new Date().getFullYear()} PrivLink. Built with privacy in mind.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-border shadow-sm hover:shadow-md transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
