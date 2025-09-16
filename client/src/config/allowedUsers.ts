export const allowedUsers: string[] = [
  "surajpatelsuraj55@gmail.com",
  "ghanshyamkamde2014@gmail.com",
  "amankumarji421@gmail.com",
  "dspckgoverna@gmail.com",
  "mayankgurjar108@gmail.com",
  "kumarravindrasopiya@gmail.com",
  "mayankransingh@gmail.com",
  "brijkishor425@gmail.com",
  "navinekka21@gmail.com",
  "Tpyadav600@gmail.com",
  "vinitsahu3600@gmail.com",
  "roshanahuja88@gmail.com",
  "chandrhass1994@gmail.com",
  "amankumarisjha@gmail.com",
  "prabhat140387@gmail.com",
  "amankumarisjha@gmail.com",
  "kumarravindrasopiya@gmail.com",
  "sudsrkrace@gmail.com",
  "Jitendrairs@gmail.com",
  "Sumitkumardhotre@gmail.com",
  "vipingautamooooo16@gmail.com",
  "opscellnpr@gmail.com",
];

export const isUserAllowed = (email: string): boolean => {
  return allowedUsers.includes(email.toLowerCase());
};
