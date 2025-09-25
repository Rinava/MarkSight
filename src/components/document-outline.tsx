"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hash } from "lucide-react";

export interface DocumentOutlineProps {
  content: string;
  onHeadingClick?: (headingId: string) => void;
}

interface Heading {
  level: number;
  text: string;
  id: string;
  line: number;
}

function getHeadingIcon(level: number) {
  return Hash;
}

function getHeadingIconSize(level: number) {
  const sizes = {
    1: "h-4 w-4",
    2: "h-3.5 w-3.5", 
    3: "h-3 w-3",
    4: "h-2.5 w-2.5",
    5: "h-2.5 w-2.5",
    6: "h-2 w-2"
  };
  return sizes[level as keyof typeof sizes] || "h-3 w-3";
}

export function DocumentOutline({ content, onHeadingClick }: DocumentOutlineProps) {
  const headings = useMemo(function extractHeadings() {
    const lines = content.split('\n');
    const headingRegex = /^(#{1,6})\s+(.+)$/;
    const extracted: Heading[] = [];

    lines.forEach(function processLine(line, index) {
      const match = line.match(headingRegex);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        
        extracted.push({
          level,
          text,
          id,
          line: index + 1
        });
      }
    });

    return extracted;
  }, [content]);

  function handleHeadingClick(heading: Heading) {
    onHeadingClick?.(heading.id);
    
    // Also scroll to the heading in the preview
    const element = document.getElementById(heading.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  if (headings.length === 0) {
    return (
      <Card className="h-fit transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Document Outline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No headings found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Document Outline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {headings.map(function renderHeading(heading, index) {
          const HeadingIcon = getHeadingIcon(heading.level);
          const iconSize = getHeadingIconSize(heading.level);
          const indent = (heading.level - 1) * 12;
          
          return (
            <motion.div
              key={`${heading.id}-${index}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left h-auto py-1 px-2 min-w-0"
                style={{ paddingLeft: `${8 + indent}px` }}
                onClick={() => handleHeadingClick(heading)}
              >
                <HeadingIcon className={`${iconSize} mr-2 flex-shrink-0`} />
                <span className={`truncate min-w-0 ${heading.level === 1 ? 'text-sm font-medium' : heading.level === 2 ? 'text-xs font-medium' : 'text-xs'}`}>
                  {heading.text}
                </span>
              </Button>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
