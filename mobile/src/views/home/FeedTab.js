import React from "react";

import ExploreTab from "./ExploreTab";

export default function FeedTab(props) {
  return (
    <ExploreTab
      {...props}
      feedType="following"
    />
  );
}