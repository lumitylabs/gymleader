import React from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { RefreshCw } from 'lucide-react';
import { CollectionItem } from "./CollectionItem";

export function SidebarCollection({
    cards,
    loading,
    syncing,
    handleRefresh,
    handleCardHover,
    handleCardLeave,
    handleCardClick,
    handleDragStart,
    handleDragEnd
}) {
    return (
        <>
            <div className="px-5 py-2 flex items-center justify-between">
                <span className="text-xs text-[#9898A0] font-semibold">
                    Collection ({cards.length})
                </span>
                <button
                    onClick={handleRefresh}
                    disabled={syncing}
                    className={`flex items-center justify-center w-9 h-9 rounded-full border border-[#2D2E34] hover:bg-[#1F1F23] hover:[#94949D] transition-all cursor-pointer ${syncing ? 'animate-spin' : ''}`}
                    title="Sync with Blockchain"
                >
                    <RefreshCw color="#94949C" size={13} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden px-4">
                <SimpleBar
                    style={{ height: '100%' }}
                    className="pr-2"
                    id="scrollbar"
                    autoHide={false}
                >
                    <div className="flex flex-col pb-4 pt-2">
                        {loading ? (
                            <div className="text-center py-10 text-gray-600 text-sm">Loading...</div>
                        ) : cards.length === 0 ? (
                            <div className="text-center py-10 text-gray-600 text-sm px-4 border border-dashed border-[#26272B] rounded-xl mt-2">
                                No cards found.<br />Connect your wallets and click refresh.
                            </div>
                        ) : (
                            cards.map((card, index) => (
                                <CollectionItem
                                    key={index}
                                    card={card}
                                    onHover={handleCardHover}
                                    onLeave={handleCardLeave}
                                    onClick={handleCardClick}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                />
                            ))
                        )}
                    </div>
                </SimpleBar>
            </div>
        </>
    );
}
