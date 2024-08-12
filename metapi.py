import requests

BASE_URL = "https://collectionapi.metmuseum.org/public/collection/v1"

def search_by_accession_number(accession_number):
    url = f"{BASE_URL}/search?q={accession_number}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json().get('objectIDs', [])
    else:
        return []

def get_object_info(object_id):
    url = f"{BASE_URL}/objects/{object_id}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return None

def display_specific_info(object_info):
    fields = {
        "4. Accession Year": object_info.get('accessionYear', 'N/A'),
        "9. Constituents": get_constituents_info(object_info.get('constituents', [])),
        "12. Title": object_info.get('title', 'N/A'),
        "13. Culture": object_info.get('culture', 'N/A'),
        "14. Period": object_info.get('period', 'N/A'),
        "15. Dynasty": object_info.get('dynasty', 'N/A'),
        "16. Reign": object_info.get('reign', 'N/A'),
        "17. Portfolio": object_info.get('portfolio', 'N/A'),
        "19. Object Date": object_info.get('objectDate', 'N/A'),
        "20. Object Begin Date": object_info.get('objectBeginDate', 'N/A'),
        "21. Medium": object_info.get('medium', 'N/A'),
        "Department": object_info.get('department', 'N/A'),
        "Dimensions": object_info.get('dimensions', 'N/A'),
        "Credit Line": object_info.get('creditLine', 'N/A'),
        "Geographic Location": get_geographic_info(object_info)
    }
    
    for label, value in fields.items():
        print(f"{label}: {value}")
    
    # Print the description
    print("\nDescription:")
    print(object_info.get('additionalInfo', 'No additional information available.'))

def get_constituents_info(constituents):
    if not constituents:
        return 'N/A'
    return '; '.join(f"{c.get('name', 'Unknown')} ({c.get('role', 'Unknown role')})" for c in constituents)

def get_geographic_info(object_info):
    geo_fields = ['city', 'state', 'county', 'country', 'region', 'subregion', 'locale']
    geo_info = [object_info.get(field) for field in geo_fields if object_info.get(field)]
    return ', '.join(geo_info) if geo_info else 'N/A'

def main():
    print("Welcome to the Met Museum Artwork Information Retriever")
    accession_number = input("Enter the accession number of the artwork: ")
    
    object_ids = search_by_accession_number(accession_number)
    
    if not object_ids:
        print("No matching artwork found.")
        return
    
    print(f"Found {len(object_ids)} matching artwork(s).")
    
    for object_id in object_ids:
        object_info = get_object_info(object_id)
        if object_info:
            if object_info['accessionNumber'] == accession_number:
                print("\nArtwork Information:")
                display_specific_info(object_info)
                return
    
    print("No exact match found for the given accession number.")

if __name__ == "__main__":
    main()