import { ParsedPage } from "@/lib/parseProposal";
import BookingCTA from "./BookingCTA";

interface SlideContentProps {
  page: ParsedPage;
  isLastPage: boolean;
}

export default function SlideContent({ page, isLastPage }: SlideContentProps) {
  return (
    <div className="h-full flex flex-col items-center justify-start py-8 md:py-12 px-4 md:px-6 overflow-y-auto">
      <div className="w-full max-w-3xl">
        <div 
          className="proposal-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
        
        {isLastPage && (
          <div className="mt-8 flex justify-center">
            <BookingCTA />
          </div>
        )}
      </div>
    </div>
  );
}
