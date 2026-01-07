let postDraft = {
  type: "moment",
  media: [],
};

export const PostDraft = {
  setType(type) {
    postDraft.type = type;
  },

  setMedia(media) {
    postDraft.media = media;
  },

  get() {
    return postDraft;
  },

  reset() {
    postDraft = {
      type: "moment",
      media: [],
    };
  },
};
