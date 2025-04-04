"use client";
import React, { useEffect, useState } from "react";
import { TherapistProfile, getTherapistProfile } from "../utils/supabaseHelpers";
import CollapsibleApproaches from "@/app/components/CollapsibleApproaches";
import TherapistFees from "./TherapistFees";
import TherapistLicenses from "./TherapistLicenses";
import TherapistLocation from "./TherapistLocation";
import TherapistQualifications from "./TherapistQualifications";
import TherapistPromptCarousel from "./TherapistPromptCarousel";
import { useTherapist } from "../contexts/TherapistContext";
import { mockTherapistProfile } from "../utils/mockTherapistData";
import Image from "next/image";
import GlobeIcon from "../../components/icons/GlobeIcon";
import CalendarIcon from "../../components/icons/CalendarIcon";
import { trackOutboundLink } from "../utils/analytics";
import CollapsibleAreasOfFocus from "@/app/components/CollapsibleAreasOfFocus";
import { TherapistVideos } from "./TherapistVideos";

// Add utility function to check image domains
const validateImageUrl = (url: string | null | undefined, therapistInfo: string): string => {
  if (!url) return "/assets/images/default-pp.png";

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Check for problem domains - specifically looking for underscores
    if (hostname.includes("_")) {
      console.warn(
        `[Modal Image Domain Warning] Invalid hostname with underscore detected: "${hostname}" for therapist ${therapistInfo}`
      );
      return "/assets/images/default-pp.png";
    }

    return url;
  } catch (e) {
    console.error(
      `[Modal Image URL Error] Invalid URL format: "${url}" for therapist ${therapistInfo}`,
      e
    );
    return "/assets/images/default-pp.png";
  }
};

// CSS for fill-from-left hover effect
const buttonHoverStyles = `
  .fill-from-left {
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
  
  .fill-from-left::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 0%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.02);
    transition: width 0.3s ease;
    z-index: -1;
  }
  
  .fill-from-left:hover::before {
    width: 100%;
  }
`;

interface TherapistProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  therapistId: string | null;
}

export default function TherapistProfileModal({
  isOpen = true,
  onClose,
  therapistId,
}: TherapistProfileModalProps) {
  const [therapist, setTherapist] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { useMockData } = useTherapist();
  const [activeTab, setActiveTab] = useState("about");

  // Fetch therapist data when the modal opens and therapistId changes
  useEffect(() => {
    async function fetchTherapist() {
      if (!isOpen || !therapistId) return;

      // If we're in mock mode, use the mock data
      if (useMockData) {
        setTherapist(mockTherapistProfile);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const profile = await getTherapistProfile(therapistId);
        setTherapist(profile);

        if (!profile) {
          setError(`No profile found for "${therapistId}"`);
        }
      } catch (err) {
        setError(`Failed to load therapist profile: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchTherapist();
  }, [isOpen, therapistId, useMockData]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    // Add event listener when the modal is open
    if (isOpen) {
      window.addEventListener("keydown", handleEscapeKey);
    }

    // Clean up the event listener when component unmounts or modal closes
    return () => {
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Handle clicking outside the modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if the click is directly on the overlay, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // If in mock mode and the modal is open, show the mock therapist
  const displayTherapist = useMockData ? mockTherapistProfile : therapist;

  // Early return if therapist is null or undefined
  if (!displayTherapist) {
    return null; // Or a loading spinner, or some other fallback UI
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start overflow-y-auto p-4 animate-fadeIn"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="therapist-profile-title"
    >
      <div
        className="bg-white rounded-lg w-full sm:max-w-5xl max-h-[90vh] overflow-y-auto relative animate-slideIn"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside the modal from closing it
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-gray-200 hover:bg-gray-300 rounded-full p-2 transition-all duration-300"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Style for button hover effect */}
        <style dangerouslySetInnerHTML={{ __html: buttonHoverStyles }} />

        {/* If in mock mode, add a banner indicating that it's mock data */}
        {useMockData && (
          <div className="bg-blue-100 text-blue-800 px-4 py-2 text-center text-sm">
            Using mock therapist data
          </div>
        )}

        {loading && !useMockData ? (
          <div className="flex items-center justify-center h-64">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"
              aria-hidden="true"
            ></div>
            <span className="sr-only">Loading therapist profile...</span>
          </div>
        ) : error && !useMockData ? (
          <div className="p-8 text-center text-red-500">
            <p>{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-all duration-300"
            >
              Close
            </button>
          </div>
        ) : displayTherapist ? (
          <div>
            {/* Banner and Header styled like the slug page */}
            <div className="bg-beige sm:py-14 py-12"></div>
            <div className="bg-white sm:pt-8 sm:px-8 pt-6 px-4">
              <div className="grid grid-cols-6 gap-8 container mx-auto">
                <div className="relative md:col-span-1 sm:col-span-2 col-span-6">
                  <div className="relative w-[40vw] md:w-full md:left-0 md:translate-x-0">
                    <div className="absolute sm:max-w-[150px] max-w-[100px] md:max-w-none w-full bottom-0 border border-grey-extraDark aspect-square rounded-full overflow-hidden md:translate-y-[50%]">
                      {displayTherapist.profile_img_url ? (
                        <Image
                          src={validateImageUrl(
                            displayTherapist.profile_img_url,
                            `${displayTherapist.first_name} ${displayTherapist.last_name} (ID: ${displayTherapist.id})`
                          )}
                          alt={`${displayTherapist.first_name} ${displayTherapist.last_name}`}
                          fill
                          className="object-cover"
                          onError={(e: any) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null; // Prevent infinite loop
                            console.error(
                              `[TherapistProfileModal] Image load error for therapist "${displayTherapist.first_name} ${displayTherapist.last_name}" (ID: ${displayTherapist.id})`,
                              {
                                url: displayTherapist.profile_img_url,
                                errorType: e.type || "Unknown error",
                              }
                            );
                            target.src = "/assets/images/default-pp.png";
                          }}
                        />
                      ) : (
                        <div className="bg-grey-light h-full w-full flex items-center justify-center"></div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:col-span-3 col-span-6">
                  <h1 className="font-new-spirit text-3xl lg:text-4xl font-light">
                    {displayTherapist.first_name || "Name Not Available"}{" "}
                    {displayTherapist.last_name || ""}
                  </h1>
                  {/* Add pronouns below the therapist's name */}
                  {displayTherapist.pronouns && (
                    <p className="text-sm text-gray-500">{displayTherapist.pronouns}</p>
                  )}
                </div>
                <div className="md:col-span-2 col-span-6 flex gap-2 mb-6 sm:mb-0 md:justify-end justify-start flex-col-reverse lg:flex-col">
                  {displayTherapist.clinic_profile_url && (
                    <a
                      href={displayTherapist.clinic_profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fill-from-left rounded-full flex items-center justify-center px-4 py-3 text-mblack bg-beige-light transition-all duration-300 transform hover:shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        trackOutboundLink(displayTherapist.clinic_profile_url, {
                          id: displayTherapist.id,
                          name: `${displayTherapist.first_name} ${displayTherapist.last_name}`,
                          linkType: "website",
                          source: "modal",
                        });
                      }}
                    >
                      <GlobeIcon className="w-4 h-4 mr-2" />
                      View Website
                    </a>
                  )}
                  {displayTherapist.booking_link && (
                    <a
                      href={displayTherapist.booking_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fill-from-left rounded-full flex items-center justify-center px-4 py-3 bg-green text-white transition-all duration-300 transform hover:shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        trackOutboundLink(displayTherapist.booking_link, {
                          id: displayTherapist.id,
                          name: `${displayTherapist.first_name} ${displayTherapist.last_name}`,
                          linkType: "booking",
                          source: "modal",
                        });
                      }}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Book Appointment
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-white sm:px-8 px-4">
              <div className="container mx-auto gap-8 grid md:grid-cols-3 sm:grid-cols-1 md:py-14 sm:py-8">
                <div className="md:col-span-2 sm:col-span-2 gap-8">
                  <div className="flex flex-col gap-2">
                    {/* Introduction videos above bio */}
                    {displayTherapist.videos &&
                      displayTherapist.videos.filter((v) => v.type === "intro").length > 0 && (
                        <div className="mb-6">
                          <h2 className="font-new-spirit font-light text-xl mb-2">
                            Meet {displayTherapist.first_name}
                          </h2>
                          <TherapistVideos
                            videos={displayTherapist.videos}
                            variant="modal"
                            type="intro"
                          />
                        </div>
                      )}

                    <h2 className="font-new-spirit font-light text-xl mb-2">
                      About {displayTherapist.first_name}
                    </h2>
                    <p className="text-mblack">{displayTherapist.bio || "No bio available"}</p>

                    {/* FAQ videos after bio in accordion style */}
                    {displayTherapist.videos &&
                      displayTherapist.videos.filter((v) => v.type === "faq").length > 0 && (
                        <div className="mt-8">
                          <h2 className="font-new-spirit font-light text-xl mb-6">FAQs</h2>
                          <TherapistVideos
                            videos={displayTherapist.videos}
                            variant="modal"
                            type="faq"
                          />
                        </div>
                      )}

                    {/* Testimonial videos below FAQ in carousel style */}
                    {displayTherapist.videos &&
                      displayTherapist.videos.filter((v) => v.type === "testimonial").length >
                        0 && (
                        <div className="mt-8">
                          <h2 className="font-new-spirit font-light text-xl mb-6">Testimonials</h2>
                          <TherapistVideos
                            videos={displayTherapist.videos}
                            variant="modal"
                            type="testimonial"
                          />
                        </div>
                      )}

                    <div className="mt-8 flex flex-col gap-2">
                      <h2 className="font-medium text-xl">Areas of Practice</h2>
                      <CollapsibleAreasOfFocus
                        areasOfFocus={displayTherapist.areas_of_focus || []}
                      />
                    </div>

                    <div className="mt-8 flex flex-col gap-2">
                      <h2 className="font-medium text-xl">Therapeutic Approaches</h2>
                      <CollapsibleApproaches approaches={displayTherapist.approaches || []} />
                    </div>
                    <div className="mt-8 flex flex-col gap-2">
                      <TherapistLicenses therapist={displayTherapist} variant="modal" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-1 sm:col-span-2 space-y-8">
                  <TherapistLocation therapist={displayTherapist} variant="modal" />
                  <TherapistFees therapist={displayTherapist} variant="modal" />
                  <TherapistQualifications therapist={displayTherapist} variant="modal" />
                </div>
              </div>
            </div>

            {/* Prompts Section */}
            <div className="bg-green-extraxlight py-12 px-8">
              <div className="flex flex-col gap-2 container mx-auto justify-center items-center">
                <h2 className="font-new-spirit font-light text-2xl text-center">
                  Get to <span className="italic">Really</span> Know {displayTherapist.first_name}
                </h2>
                <h3 className="text-base mb-10 text-center">
                  Fun facts about {displayTherapist.first_name}'s approach and what working with{" "}
                  {displayTherapist.first_name} is like.
                </h3>
                <TherapistPromptCarousel prompts={displayTherapist.prompts || []} />
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-green-extraxlight pb-12 px-8">
              <div className="bg-beige-extralight p-10 flex flex-col sm:flex-row rounded-lg border border-grey-light gap-2 container mx-auto justify-between items-center">
                <h2 className="font-new-spirit font-light text-2xl">
                  Get in touch with {displayTherapist.first_name}
                </h2>
                <div className="flex gap-2">
                  <div className="md:col-span-2 col-span-6 flex flex-col sm:flex-row gap-2 mb-6 sm:mb-0 md:justify-end justify-start">
                    {displayTherapist.clinic_profile_url && (
                      <a
                        href={displayTherapist.clinic_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fill-from-left rounded-full flex items-center justify-center px-4 py-3 text-mblack bg-beige transition-all duration-300 transform hover:shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          trackOutboundLink(displayTherapist.clinic_profile_url, {
                            id: displayTherapist.id,
                            name: `${displayTherapist.first_name} ${displayTherapist.last_name}`,
                            linkType: "website",
                            source: "modal",
                          });
                        }}
                      >
                        <GlobeIcon className="w-4 h-4 mr-2" />
                        View Website
                      </a>
                    )}
                    {displayTherapist.booking_link && (
                      <a
                        href={displayTherapist.booking_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fill-from-left rounded-full flex items-center justify-center px-4 py-3 bg-green text-white transition-all duration-300 transform hover:shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          trackOutboundLink(displayTherapist.booking_link, {
                            id: displayTherapist.id,
                            name: `${displayTherapist.first_name} ${displayTherapist.last_name}`,
                            linkType: "booking",
                            source: "modal",
                          });
                        }}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Book Appointment
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p>No therapist data found</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-all duration-300"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
