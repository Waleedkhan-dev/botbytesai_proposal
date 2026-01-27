import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Calendar,
  AlertCircle,
  Share2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  Building2,
  Target,
  Lightbulb,
  TrendingUp,
  ClipboardList,
  Sparkles,
  Phone,
  Trash2,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Swal from 'sweetalert2';
import { Button } from "@/components/ui/button";

interface Proposal {
  id: number;
  created_at: string;
  "PROPOSAL DATA": string | null;
  STATUS: string | null;
  share_id: string | null;
  is_published: boolean;
  client_name: string | null;
  share_url: string | null;
}

interface SlideContent {
  title: string;
  icon: React.ReactNode;
  content: string;
}

const ProposalPage = () => {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<SlideContent[]>([]);

  const navigate = useNavigate();

  // ✅ Generate dynamic share URL based on current origin (fixes localhost issue)
  const generateShareUrl = (shareId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/proposal/${shareId}`;
  };

  const fetchProposal = async () => {
    if (!id) {
      setError("No proposal ID provided");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query;
    if (isUUID) {
      query = supabase
        .from("PROPOSAL")
        .select("*")
        .eq("share_id", id)
        .maybeSingle();
    } else {
      query = supabase
        .from("PROPOSAL")
        .select("*")
        .eq("id", parseInt(id))
        .maybeSingle();
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error("❌ Supabase error:", fetchError.message);
      setError(fetchError.message);
      setProposal(null);
    } else if (!data) {
      setError("Proposal not found");
      setProposal(null);
    } else {
      console.log("✅ Proposal fetched:", data);
      // ✅ Regenerate share URL dynamically with current origin
      const proposalWithDynamicUrl: Proposal = {
        ...data,
        share_url: data.share_id ? generateShareUrl(data.share_id) : null,
      };
      setProposal(proposalWithDynamicUrl);
      parseProposalIntoSlides(data["PROPOSAL DATA"]);
    }

    setIsLoading(false);
  };

  const parseProposalIntoSlides = (htmlContent: string | null) => {
    if (!htmlContent) {
      setSlides([]);
      return;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const parsedSlides: SlideContent[] = [];

    const headers = doc.querySelectorAll("h1, h2");

    const iconMap: { [key: string]: React.ReactNode } = {
      "introduction": <Building2 className="w-8 h-8" />,
      "personalized": <Building2 className="w-8 h-8" />,
      "problem": <Target className="w-8 h-8" />,
      "current": <Target className="w-8 h-8" />,
      "solution": <Lightbulb className="w-8 h-8" />,
      "recommended": <Lightbulb className="w-8 h-8" />,
      "roi": <TrendingUp className="w-8 h-8" />,
      "impact": <TrendingUp className="w-8 h-8" />,
      "expected": <TrendingUp className="w-8 h-8" />,
      "implementation": <ClipboardList className="w-8 h-8" />,
      "plan": <ClipboardList className="w-8 h-8" />,
      "why": <Sparkles className="w-8 h-8" />,
      "works": <Sparkles className="w-8 h-8" />,
      "next": <CalendarCheck className="w-8 h-8" />,
      "step": <CalendarCheck className="w-8 h-8" />,
      "contact": <Phone className="w-8 h-8" />,
    };

    const getIcon = (title: string): React.ReactNode => {
      const lowerTitle = title.toLowerCase();
      for (const [key, icon] of Object.entries(iconMap)) {
        if (lowerTitle.includes(key)) {
          return icon;
        }
      }
      return <FileText className="w-8 h-8" />;
    };

    headers.forEach((header, index) => {
      const title = header.textContent || `Section ${index + 1}`;
      let content = "";

      let sibling = header.nextElementSibling;
      while (sibling && !["H1", "H2"].includes(sibling.tagName)) {
        content += sibling.outerHTML;
        sibling = sibling.nextElementSibling;
      }

      if (content.trim()) {
        parsedSlides.push({
          title,
          icon: getIcon(title),
          content,
        });
      }
    });

    if (parsedSlides.length === 0) {
      parsedSlides.push({
        title: "Proposal",
        icon: <FileText className="w-8 h-8" />,
        content: htmlContent,
      });
    }

    setSlides(parsedSlides);
  };

  useEffect(() => {
    fetchProposal();
  }, [id]);

  // const deleteProposal = async () => {
  //   if (!proposal) return;

  //   const result = await Swal.fire({
  //     title: 'Delete proposal?',
  //     text: 'Are you sure you want to delete this proposal? This action cannot be undone.',
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonColor: '#dc2626',
  //     cancelButtonColor: '#6b7280',
  //     confirmButtonText: 'Yes, delete it',
  //     cancelButtonText: 'Cancel',
  //   });

  //   if (!result.isConfirmed) return;

  //   try {
  //     const { error } = await supabase.from('PROPOSAL').delete().eq('id', proposal.id);
  //     if (error) {
  //       console.error('❌ Error deleting proposal:', error.message);
  //       await Swal.fire({ icon: 'error', title: 'Delete failed', text: error.message });
  //       return;
  //     }
  //     await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Proposal deleted' });
  //     navigate('/');
  //   } catch (err: any) {
  //     console.error('❌ Error deleting proposal:', err.message);
  //     await Swal.fire({ icon: 'error', title: 'Delete failed', text: err.message });
  //   }
  // };

  const copyShareLink = async () => {
    if (proposal?.share_url) {
      await navigator.clipboard.writeText(proposal.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleBookMeeting = () => {
    window.open("https://calendar.app.google/MxGJokQVE2bp4uGt8", "_blank");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading proposal...</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h1>
            <p className="text-gray-500 mb-6">
              {error || "The proposal you're looking for doesn't exist or has been removed."}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">


          <div className="flex items-center gap-3">
            {/* Slide indicator */}
            <div className="hidden sm:flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${index === currentSlide
                    ? "bg-violet-600 w-6"
                    : "bg-gray-300 hover:bg-gray-400"
                    }`}
                />
              ))}
            </div>

            <span className="text-gray-400 text-sm">
              {currentSlide + 1} / {slides.length}
            </span>

            {/* {proposal.share_url && (
              <button
                onClick={copyShareLink}
                className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Share
                  </>
                )}
              </button>
            )} */}

            {/* /  <button
              onClick={deleteProposal}
              className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
              title="Delete proposal"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button> */}
          </div>
          <Button
            onClick={handleBookMeeting}
            className="inline-flex items-center gap-2 text-white  from-violet-500 to-purple-600  transition-colors"
          >

            Book a Meeting
            <CalendarCheck className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Proposal Title Bar */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-200 px-6 py-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {proposal.client_name
                ? `Proposal for ${proposal.client_name}`
                : `Business Proposal`
              }
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(proposal.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Slide Content */}
        <div className="flex-1 px-6 py-8 overflow-hidden">
          <div className="max-w-4xl mx-auto h-full">
            <AnimatePresence mode="wait">
              {slides.length > 0 && (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 shadow-sm">
                    {/* Slide Header */}
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
                        {slides[currentSlide].icon}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                        {slides[currentSlide].title}
                      </h2>
                    </div>

                    {/* Slide Content */}
                    <div
                      className="proposal-content prose prose-lg max-w-none
                        prose-headings:text-gray-900 prose-headings:font-semibold
                        prose-p:text-gray-600 prose-p:leading-relaxed
                        prose-li:text-gray-600 prose-li:leading-relaxed
                        prose-strong:text-violet-600 prose-strong:font-semibold
                        prose-ul:space-y-2 prose-ol:space-y-2
                        prose-ul:list-disc prose-ul:pl-6
                        prose-ol:list-decimal prose-ol:pl-6"
                      dangerouslySetInnerHTML={{ __html: slides[currentSlide].content }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-white">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${currentSlide === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            {/* Mobile Slide Indicator */}
            <div className="flex sm:hidden items-center gap-1">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${index === currentSlide ? "bg-violet-600" : "bg-gray-300"
                    }`}
                />
              ))}
            </div>

            {/* Next / Book Meeting Button */}
            {isLastSlide ? (
              <motion.button
                onClick={handleBookMeeting}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold bg-gradient-to-r  bg-violet-600 text-white hover:bg-violet-700 transition-all  shadow-lg shadow-orange-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CalendarCheck className="w-5 h-5" />
                Book a Meeting
              </motion.button>
            ) : (
              <button
                onClick={nextSlide}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium bg-violet-600 text-white hover:bg-violet-700 transition-all"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Custom styles for proposal content */}
      <style>{`
        .proposal-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
        .proposal-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
        .proposal-content li {
          margin-bottom: 0.5rem;
          padding-left: 0.5rem;
          color: #4b5563;
        }
        .proposal-content p {
          margin-bottom: 1rem;
          color: #4b5563;
        }
        .proposal-content strong {
          color: #7c3aed;
          font-weight: 600;
        }
        .proposal-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #111827;
        }
      `}</style>
    </div>
  );
};

export default ProposalPage;