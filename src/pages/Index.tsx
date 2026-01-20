import { motion, AnimatePresence } from "framer-motion";
import { FileText, ArrowRight, Sparkles, Loader2, Plus, Copy, Check, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import Swal from 'sweetalert2';
import { set } from "date-fns";

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
  const [creatingId, setCreatingId] = useState<number | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [proposalData, setProposalData] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newProposalUrl, setNewProposalUrl] = useState<string | null>(null);

  const generateShareUrl = (shareId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/proposal/${shareId}`;
  };

  // ✅ Dynamically regenerate share URL based on current origin (fixes localhost issue)
  const withDynamicShareUrl = (proposal: Proposal): Proposal => {
    if (proposal.share_id) {
      return {
        ...proposal,
        share_url: generateShareUrl(proposal.share_id),
      };
    }
    return proposal;
  };

  // ✅ Auto-generate share link for proposals that don't have one
  const ensureShareLink = useCallback(async (proposal: Proposal): Promise<Proposal> => {
    // If proposal already has share_id and share_url, return as-is
    if (proposal.share_id && proposal.share_url) {
      return proposal;
    }

    // Generate new share link
    const shareId = crypto.randomUUID();
    const shareUrl = generateShareUrl(shareId);

    console.log(`🔗 Auto-generating share link for proposal #${proposal.id}`);

    try {
      const { data, error } = await supabase
        .from("PROPOSAL")
        .update({
          share_id: shareId,
        })
        .eq("id", proposal.id)
        .select("*")
        .single();

      if (error) {
        console.error(`❌ Error generating share link for #${proposal.id}:`, error);
        return proposal; // Return original if update fails
      }

      console.log(`✅ Share link generated for proposal #${proposal.id}:`, shareUrl);
      // ✅ Return with dynamically generated share_url (not from DB)
      return { ...data, share_url: shareUrl } as Proposal;
    } catch (err) {
      console.error(`❌ Error:`, err);
      return proposal;
    }
  }, []);

  // Initial fetch
  const fetchProposals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("PROPOSAL")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("❌ Supabase error:", error.message);
        setError(error.message);
        setProposals([]);
      } else {
        console.log("✅ Proposals fetched:", data?.length);
        // ✅ Regenerate all share URLs dynamically based on current origin
        const proposalsWithDynamicUrls = (data || []).map(withDynamicShareUrl);
        setProposals(proposalsWithDynamicUrls);
      }
    } catch (err: any) {
      console.error("❌ Error fetching:", err.message);
      setError(err.message);
    }
    setIsLoading(false);
  }, [withDynamicShareUrl]);

  // ✅ REALTIME SUBSCRIPTION - Auto-updates without refresh
  useEffect(() => {
    // Initial fetch
    fetchProposals();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('proposals-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'PROPOSAL',
        },
        async (payload) => {
          console.log('✅ REALTIME INSERT:', payload.new);
          let newProposal = payload.new as Proposal;

          // ✅ AUTO-GENERATE share link if missing (for n8n-created proposals)
          if (!newProposal.share_id || !newProposal.share_url) {
            console.log('🔄 New proposal missing share link, generating...');
            newProposal = await ensureShareLink(newProposal);
          } else {
            // ✅ Regenerate share URL with current origin
            newProposal = withDynamicShareUrl(newProposal);
          }

          // Add new proposal to the top of the list
          setProposals((prev) => {
            // Avoid duplicates
            if (prev.some(p => p.id === newProposal.id)) return prev;
            return [newProposal, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'PROPOSAL',
        },
        (payload) => {
          console.log('✅ REALTIME UPDATE:', payload.new);
          const updatedProposal = payload.new as Proposal;
          // ✅ Regenerate share URL with current origin
          const proposalWithDynamicUrl = withDynamicShareUrl(updatedProposal);
          // Update the proposal in the list
          setProposals((prev) =>
            prev.map((p) => (p.id === proposalWithDynamicUrl.id ? proposalWithDynamicUrl : p))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'PROPOSAL',
        },
        (payload) => {
          console.log('✅ REALTIME DELETE:', payload.old);
          const deletedId = (payload.old as Proposal).id;
          // Remove from list
          setProposals((prev) => prev.filter((p) => p.id !== deletedId));
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Unsubscribing from realtime');
      supabase.removeChannel(channel);
    };
  }, [fetchProposals, ensureShareLink, withDynamicShareUrl]);

  // ✅ N8N WEBHOOK TRIGGER - No page reload needed!
  useEffect(() => {
    let reloadTimer: NodeJS.Timeout;
    const triggerN8NWebhook = async () => {
      try {
        console.log('🚀 Triggering n8n webhook...');
        const response = await fetch("https://bevvy-bullet.app.n8n.cloud/webhook/generate-proposal");
        const data = await response.json();
        console.log(" N8N Data:", data);
        reloadTimer = setTimeout(() => {
          window.location.reload();
        }, 3 * 60 * 1000)
      } catch (error) {
        console.error("❌ n8n error:", error);
      }
    };

    triggerN8NWebhook();
  }, []);

  const deleteProposal = async (id: number) => {
    const result = await Swal.fire({
      title: 'Delete proposal?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      // Optimistic update - remove immediately
      setProposals(prev => prev.filter(p => p.id !== id));

      const { error } = await supabase.from('PROPOSAL').delete().eq('id', id);

      if (error) {
        console.error('❌ Error deleting:', error.message);
        await Swal.fire({ icon: 'error', title: 'Delete failed', text: error.message });
        fetchProposals(); // Revert on error
        return;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('❌ Error:', err.message);
      await Swal.fire({ icon: 'error', title: 'Error', text: err.message });
      fetchProposals();
    }
  };

  const createProposal = async () => {
    if (!proposalData.trim()) {
      alert("Please enter proposal data");
      return;
    }

    setIsCreating(true);

    try {
      const shareId = crypto.randomUUID();
      const shareUrl = generateShareUrl(shareId);

      console.log("📝 Creating proposal with:", { shareId, shareUrl });

      const { data, error } = await supabase
        .from("PROPOSAL")
        .insert({
          "PROPOSAL DATA": proposalData,
          STATUS: "draft",
          client_name: clientName || null,
          is_published: false,
          share_id: shareId,
        })
        .select("*")
        .single();

      if (error) {
        console.error("❌ Insert error:", error);
        throw error;
      }

      console.log("✅ Proposal created with link:", data);

      // Realtime will auto-add it, but we can also do optimistic update
      setProposals(prev => {
        if (prev.some(p => p.id === data.id)) return prev;
        return [data, ...prev];
      });

      setNewProposalUrl(shareUrl);
      setClientName("");
      setProposalData("");

    } catch (err: any) {
      console.error("❌ Error creating proposal:", err.message);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || "Failed to create proposal"
      });
    }

    setIsCreating(false);
  };

  // Generate missing share links for existing proposals
  const generateMissingLinks = async () => {
    try {
      const proposalsWithoutLinks = proposals.filter(p => !p.share_id || !p.share_url);

      if (proposalsWithoutLinks.length === 0) {
        alert("All proposals have shareable links!");
        return;
      }

      console.log(`🔄 Generating links for ${proposalsWithoutLinks.length} proposals...`);

      for (const proposal of proposalsWithoutLinks) {
        const shareId = crypto.randomUUID();
        const shareUrl = generateShareUrl(shareId);

        const { error } = await supabase
          .from("PROPOSAL")
          .update({
            share_id: shareId,
          })
          .eq("id", proposal.id);

        if (error) {
          console.error(`❌ Error updating proposal ${proposal.id}:`, error);
        } else {
          console.log(`✅ Link generated for proposal ${proposal.id}`);
        }
      }

      // Refresh proposals
      await fetchProposals();
      alert(`✅ Generated links for ${proposalsWithoutLinks.length} proposals!`);
    } catch (err: any) {
      console.error("❌ Error:", err.message);
      alert("Error: " + err.message);
    }
  };

  const createProposalCopy = async (originalProposal: Proposal) => {
    setCreatingId(originalProposal.id);

    try {
      const shareId = crypto.randomUUID();
      const shareUrl = generateShareUrl(shareId);

      const { data, error } = await supabase
        .from("PROPOSAL")
        .insert({
          "PROPOSAL DATA": originalProposal["PROPOSAL DATA"],
          STATUS: "draft",
          client_name: null,
          is_published: false,
          share_id: shareId,
        })
        .select("*")
        .single();

      if (error) throw error;

      console.log("✅ Copy created:", data);


      setProposals(prev => {
        if (prev.some(p => p.id === data.id)) return prev;
        return [data, ...prev];
      });

      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        await Swal.fire({
          icon: 'success',
          title: 'Copy Created!',
          html: `<p>Link copied to clipboard:</p><code style="font-size: 11px; word-break: break-all;">${shareUrl}</code>`,
          timer: 2500,
          showConfirmButton: false,
        });
      } catch (_) {
        await Swal.fire({
          icon: 'success',
          title: 'Copy Created!',
          html: `<code style="font-size: 11px; word-break: break-all;">${shareUrl}</code>`,
          timer: 2500,
          showConfirmButton: false,
        });
      }

    } catch (err: any) {
      console.error("❌ Error:", err.message);
      await Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }

    setCreatingId(null);
  };

  const copyShareLink = async (proposal: Proposal) => {
    if (proposal.share_url) {
      try {
        await navigator.clipboard.writeText(proposal.share_url);
        setCopiedId(proposal.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error("Copy failed:", err);
      }
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
          {/* Realtime indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </div>
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
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">Your Proposals</h2>
              {proposals.some(p => !p.share_id || !p.share_url) && (
                <button
                  onClick={generateMissingLinks}
                  className="px-3 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
                  title="Generate missing share links"
                >
                  🔗 Generate Links
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading proposals...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-destructive mb-4">{error}</p>
                <button
                  onClick={fetchProposals}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                >
                  Retry
                </button>
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No proposals yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {proposals.map((proposal) => (
                    <motion.div
                      key={proposal.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -100 }}
                      transition={{ duration: 0.25 }}
                      className="bg-card border border-border rounded-xl p-6 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {proposal.client_name
                              ? `Proposal for ${proposal.client_name}`
                              : `Proposal #${proposal.id}`
                            }
                          </h3>
                          {proposal.STATUS && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${proposal.STATUS === 'published'
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
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {proposal.share_url && (
                          <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded block truncate">
                            {proposal.share_url}
                          </code>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {/* Create Copy */}
                        <button
                          onClick={() => createProposalCopy(proposal)}
                          disabled={creatingId === proposal.id}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                          title="Create copy"
                        >
                          {creatingId === proposal.id ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <Plus className="w-5 h-5 text-red-600" />
                          )}
                        </button>

                        {/* Copy Link */}
                        {proposal.share_url && (
                          <button
                            onClick={() => copyShareLink(proposal)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            title="Copy link"
                          >
                            {copiedId === proposal.id ? (
                              <Check className="w-5 h-5 text-green-600" />
                            ) : (
                              <Copy className="w-5 h-5 text-muted-foreground" />
                            )}
                          </button>
                        )}

                        {/* View */}
                        <Link
                          to={`/proposal/${proposal.share_id || proposal.id}`}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors"
                          title="View"
                        >
                          <ExternalLink className="w-5 h-5 text-muted-foreground" />
                        </Link>

                        {/* Delete */}
                        <button
                          onClick={() => deleteProposal(proposal.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
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
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Proposal Created!</h2>
                <p className="text-muted-foreground mb-4">Your shareable link has been generated:</p>
                <div className="bg-muted rounded-lg p-3 flex items-center gap-2 mb-6 break-all">
                  <code className="text-xs flex-1">{newProposalUrl}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newProposalUrl);
                      alert("Copied to clipboard!");
                    }}
                    className="p-2 hover:bg-background rounded-md flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewProposalUrl(null);
                      setClientName("");
                      setProposalData("");
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
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Create New Proposal</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Client Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Acme Corp"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Proposal Data
                    </label>
                    <textarea
                      placeholder="Paste your proposal content here..."
                      value={proposalData}
                      onChange={(e) => setProposalData(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-40 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setClientName("");
                      setProposalData("");
                    }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createProposal}
                    disabled={isCreating || !proposalData.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Proposal
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Index;