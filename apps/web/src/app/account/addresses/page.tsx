import { AddressBookClient } from "./address-book-client";

export const metadata = {
  title: "Address Book | MyPetMart",
  description: "Manage your saved shipping addresses on MyPetMart.",
};

export default function AddressBookPage() {
  return <AddressBookClient />;
}
