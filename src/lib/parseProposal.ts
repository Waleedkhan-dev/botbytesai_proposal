export interface ParsedPage {
  id: number;
  title: string;
  content: string;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export function parseProposalHTML(html: string): ParsedPage[] {
  if (!html || html.trim() === '') {
    return [];
  }

  const pages: ParsedPage[] = [];
  
  // Extract h1 if present
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const h1Content = h1Match ? h1Match[0] : '';
  
  // Split by h2 tags while keeping the h2 tags
  const sections = html.split(/(?=<h2)/i).filter(Boolean);
  
  let pageIndex = 0;
  
  sections.forEach((section, index) => {
    // Skip if this is just the h1 without any h2
    if (section.includes('<h1') && !section.includes('<h2')) {
      return;
    }
    
    // Extract h2 title for reference
    const h2Match = section.match(/<h2[^>]*>(.*?)<\/h2>/i);
    const title = h2Match ? h2Match[1] : '';
    
    // For first page with h2, prepend h1
    let content = section;
    if (pageIndex === 0 && h1Content) {
      content = h1Content + section;
    }
    
    pages.push({
      id: pageIndex,
      title,
      content,
      isFirstPage: pageIndex === 0,
      isLastPage: false,
    });
    
    pageIndex++;
  });
  
  // Mark last page
  if (pages.length > 0) {
    pages[pages.length - 1].isLastPage = true;
  }
  
  return pages;
}
