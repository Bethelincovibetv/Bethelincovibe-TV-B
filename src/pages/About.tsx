import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Target } from "lucide-react";
import TVFrame from "@/components/TVFrame";
import PageHero from "@/components/PageHero";
import heroAbout from "@/assets/hero-about.jpg";

export default function About() {
  return (
    <>
      <PageHero
        image={heroAbout}
        eyebrow="About us"
        title="Built for Lagos entrepreneurs"
        subtitle="Bethelincovibe TV provides business information, a Lagos business directory, and marketing tips focused on the Nigerian market."
      />
      <div className="container mx-auto px-4 py-12 max-w-3xl">

      {/* TV Video */}
      <div className="mb-10">
        <TVFrame placement="about" />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Target className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-lg mb-1">Our Mission</h2>
              <p className="text-muted-foreground">To empower Lagos entrepreneurs with the information, connections, and tools they need to build successful businesses.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <BookOpen className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-lg mb-1">What We Offer</h2>
              <p className="text-muted-foreground">Comprehensive startup guides, a curated business directory, marketing strategies, and business tips tailored for the Lagos market.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-4 pt-6">
            <Users className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-lg mb-1">Our Community</h2>
              <p className="text-muted-foreground">We're building a community of Lagos entrepreneurs who share knowledge, connect with other businesses, and grow together.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}
