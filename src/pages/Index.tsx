import { motion } from "framer-motion";
import { FileText, ArrowRight, Sparkles, Loader2, Plus, Copy, Check, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Swal from 'sweetalert2';

interface Proposal {
  id: number;
  created_at: string;
  "PROPOSAL DATA": string | null;
  STATUS: string | null;
  share_id: string | null;
  share_url: string | null;
  client_name: string | null;
}

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);



  // Modal state for creating new proposal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [proposalData, setProposalData] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newProposalUrl, setNewProposalUrl] = useState<string | null>(null);

  const ensureShareUrls = async (fetchedProposals: Proposal[]) => {
    // For any proposal missing a share_url, try to fix it automatically.
    // If the row already has a share_id we just compute the URL and update the same row.
    // If neither share_id nor share_url exist (rare), we create a copy (no client name) to generate a new share_id + url.
    let didUpdate = false;

    for (const p of fetchedProposals || []) {
      if (p.share_url) continue;

      try {
        if (p.share_id) {
          const shareUrl = generateShareUrl(p.share_id);
          const { error: updateError } = await supabase
            .from("PROPOSAL")
            .update({ share_url: shareUrl })
            .eq("id", p.id);

          if (updateError) {
            console.error("❌ Error updating share_url:", updateError.message);
          } else {
            didUpdate = true;
            console.log(`✅ Added share_url for proposal ${p.id}`);
          }
        } else {
          // No share_id: create a copy (no client name) to generate a new share_id and then set its share_url
          const { data: copy, error: copyError } = await supabase
            .from("PROPOSAL")
            .insert({
              "PROPOSAL DATA": p["PROPOSAL DATA"],
              STATUS: "draft",
              client_name: null,
              is_published: false,
            })
            .select("*")
            .single();

          if (copyError) {
            console.error("❌ Error creating copy to generate share_id:", copyError.message);
          } else {
            const shareUrl = generateShareUrl(copy.share_id);
            const { error: updateError } = await supabase
              .from("PROPOSAL")
              .update({ share_url: shareUrl })
              .eq("id", copy.id);

            if (updateError) {
              console.error("❌ Error updating new copy share_url:", updateError.message);
            } else {
              didUpdate = true;
              console.log(`✅ Created copy ${copy.id} and set share_url`);
            }
          }
        }
      } catch (err: any) {
        console.error("❌ Error ensuring share_url:", err.message || err);
      }
    }

    return didUpdate;
  };

  const fetchProposals = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("PROPOSAL")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Supabase error:", error.message);
      setError(error.message);
      setProposals([]);
    } else {
      console.log("✅ Proposals fetched:", data);
      setProposals(data || []);

      // Auto-generate missing share URLs (no prompts or clicks)
      try {
        const didUpdate = await ensureShareUrls(data || []);
        if (didUpdate) {
          // Re-fetch once to pick up updates
          const { data: refreshed, error: refreshError } = await supabase
            .from("PROPOSAL")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(10);

          if (!refreshError) {
            setProposals(refreshed || []);
            console.log("🔁 Refreshed proposals after ensuring share URLs");
          }
        }
      } catch (err: any) {
        console.error("❌ Error running ensureShareUrls:", err.message || err);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const deleteProposal = async (id: number) => {
    const result = await Swal.fire({
      title: 'Delete proposal?',
      text: 'Are you sure you want to delete this proposal? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase.from('PROPOSAL').delete().eq('id', id);
      if (error) {
        console.error('❌ Error deleting proposal:', error.message);
        await Swal.fire({ icon: 'error', title: 'Delete failed', text: error.message });
        return;
      }
      await Swal.fire({ icon: 'success', title: 'Deleted', text: 'Proposal deleted' });
      fetchProposals();
    } catch (err: any) {
      console.error('❌ Error deleting proposal:', err.message);
      await Swal.fire({ icon: 'error', title: 'Delete failed', text: err.message });
    }
  };

  const generateShareUrl = (shareId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/proposal/${shareId}`;
  };

  const createProposal = async () => {
    if (!proposalData.trim()) {
      alert("Please enter proposal data");
      return;
    }

    setIsCreating(true);

    try {
      // Insert the proposal
      const { data, error } = await supabase
        .from("PROPOSAL")
        .insert({
          "PROPOSAL DATA": proposalData,
          STATUS: "draft",
          client_name: clientName || null,
          is_published: false,
        })
        .select("*")
        .single();

      if (error) throw error;

      // Generate and update the share URL
      const shareUrl = generateShareUrl(data.share_id);

      const { data: updatedData, error: updateError } = await supabase
        .from("PROPOSAL")
        .update({ share_url: shareUrl })
        .eq("id", data.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      console.log("✅ Proposal created:", updatedData);
      setNewProposalUrl(shareUrl);

      // Refresh the list
      fetchProposals();

      // Clear form
      setClientName("");
      setProposalData("");

    } catch (err: any) {
      console.error("❌ Error creating proposal:", err.message);
      alert("Error creating proposal: " + err.message);
    }

    setIsCreating(false);
  };

  const createProposalCopy = async (originalProposal: Proposal, clientName?: string) => {
    // Create a copy automatically without prompting. We intentionally don't use a client name.
    setIsCreating(true);

    try {
      // Create a new copy (client_name will be null unless explicitly provided)
      const { data, error } = await supabase
        .from("PROPOSAL")
        .insert({
          "PROPOSAL DATA": originalProposal["PROPOSAL DATA"],
          STATUS: "draft",
          client_name: clientName || null,
          is_published: false,
        })
        .select("*")
        .single();

      if (error) throw error;

      // Generate and update the share URL
      const shareUrl = generateShareUrl(data.share_id);

      const { error: updateError } = await supabase
        .from("PROPOSAL")
        .update({ share_url: shareUrl })
        .eq("id", data.id);

      if (updateError) throw updateError;

      console.log("✅ Proposal copy created (auto)");

      // Copy to clipboard and notify
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (_) {
        // ignore clipboard errors in non-secure contexts
      }

      // Refresh the list
      fetchProposals();

    } catch (err: any) {
      console.error("❌ Error creating copy:", err.message || err);
    }

    setIsCreating(false);
  };

  const copyShareLink = async (proposal: Proposal) => {
    if (proposal.share_url) {
      await navigator.clipboard.writeText(proposal.share_url);
      setCopiedId(proposal.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">B</span>
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">
              BOTBYTES
            </span>
          </div>

          {/* <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Proposal
          </button> */}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full mb-8">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Proposal Manager</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Create & Share
              <br />
              <span className="text-primary">Unique Proposals</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Create enriched proposals, generate unique shareable links for each client,
              and track all your proposals in one place.
            </p>
          </motion.div>

          {/* Proposals List */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-foreground mb-6">Your Proposals</h2>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading proposals...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive">{error}</p>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No proposals yet</p>
                {/* <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Proposal
                </button> */}
              </div>
            ) : (
              <div className="grid gap-4">
                {proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="bg-card border border-border rounded-xl p-6 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {proposal.client_name
                            ? `Proposal for ${proposal.client_name}`
                            : `Proposal #${proposal.id}`
                          }
                        </h3>
                        {proposal.STATUS && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${proposal.STATUS === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {proposal.STATUS}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Created {new Date(proposal.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      {proposal.share_url && (
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          {proposal.share_url}
                        </code>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => createProposalCopy(proposal)}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        title="Create copy for new client"
                      >
                        <Plus className="w-5 text-red-600 h-5  text-" />
                      </button>

                      {proposal.share_url && (
                        <button
                          onClick={() => copyShareLink(proposal)}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors"
                          title="Copy share link"
                        >
                          {copiedId === proposal.id ? (
                            <Check className="w-5 h-5 text-green-600" />
                          ) : (
                            <Copy className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      )}

                      <Link
                        to={`/proposal/${proposal.share_id || proposal.id}`}
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        title="View proposal"
                      >
                        <ExternalLink className="w-5 h-5 text-muted-foreground" />
                      </Link>

                      <button
                        onClick={() => deleteProposal(proposal.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete proposal"
                      >
                        <Trash2 className="w-5 h-5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>Share proposals via unique links: yoursite.com/proposal/[unique-id]</p>
        </div>
      </footer>

      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl p-6 w-full max-w-lg"
          >
            {newProposalUrl ? (
              // Success state
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Proposal Created!</h2>
                <p className="text-muted-foreground mb-4">Share this link with your client:</p>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2 mb-6">
                  <code className="text-sm flex-1 truncate">{newProposalUrl}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newProposalUrl);
                      alert("Copied to clipboard!");
                    }}
                    className="p-2 hover:bg-background rounded-md"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewProposalUrl(null);
                    }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    to={newProposalUrl.replace(window.location.origin, '')}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    View Proposal
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              // Form state
              // <>
              //   <h2 className="text-xl font-bold text-foreground mb-4">Create New Proposal</h2>

              //   <div className="space-y-4">
              //     <div>
              //       <label className="block text-sm font-medium text-foreground mb-1">
              //         Client Name (optional)
              //       </label>
              //       <input
              //         type="text"
              //         value={clientName}
              //         onChange={(e) => setClientName(e.target.value)}
              //         placeholder="e.g., Acme Corp"
              //         className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              //       />
              //     </div>

              //     <div>
              //       <label className="block text-sm font-medium text-foreground mb-1">
              //         Proposal Data *
              //       </label>
              //       <textarea
              //         value={proposalData}
              //         onChange={(e) => setProposalData(e.target.value)}
              //         placeholder="Enter your proposal content (text or JSON)"
              //         rows={6}
              //         className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              //       />
              //     </div>
              //   </div>

              //   <div className="flex gap-3 mt-6">
              //     <button
              //       onClick={() => setShowCreateModal(false)}
              //       className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
              //     >
              //       Cancel
              //     </button>
              //     <button
              //       onClick={createProposal}
              //       disabled={isCreating || !proposalData.trim()}
              //       className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              //     >
              //       {isCreating ? (
              //         <>
              //           <Loader2 className="w-4 h-4 animate-spin" />
              //           Creating...
              //         </>
              //       ) : (
              //         <>
              //           <Plus className="w-4 h-4" />
              //           Create Proposal
              //         </>
              //       )}
              //     </button>
              //   </div>
              // </>
              <div></div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Index;