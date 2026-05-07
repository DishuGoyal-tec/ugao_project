import os
import fitz  # PyMuPDF
import pandas as pd
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# Configuration
DATA_DIR = r"C:\Users\Asus\OneDrive\Desktop\Ugao_project"
# NOTE: FAISS C++ writer cannot handle non-ASCII paths (emoji folder name).
# Index is stored in a plain-ASCII sibling directory instead.
INDEX_PATH = r"C:\Users\Asus\OneDrive\Desktop\Ugao_project\ugaoo_faiss_index"

PDF_FILES = ["02_ugaoo_faq.pdf", "03_ugaoo_policy.pdf"]
CSV_FILES = [
    "ugaoo_products.csv", 
    "ugaoo_orders.csv", 
    "ugaoo_customers.csv", 
    "ugaoo_city_channel_sales.csv" # Adjusted from user request to match disk
]

def extract_text_from_pdf(pdf_path):
    text = ""
    doc = fitz.open(pdf_path)
    for page in doc:
        text += page.get_text()
    return text

def extract_text_from_csv(csv_path):
    df = pd.read_csv(csv_path).head(200)  # cap at 200 rows to keep chunk count manageable
    # Convert each row to a string representation
    rows = df.apply(lambda x: " | ".join([f"{col}: {val}" for col, val in x.items()]), axis=1)
    return "\n".join(rows.tolist())

def main():
    all_documents = []
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

    # Friendly display names for each source file
    SOURCE_LABELS = {
        "02_ugaoo_faq.pdf":              "FAQ PDF",
        "03_ugaoo_policy.pdf":           "Policy PDF",
        "ugaoo_products.csv":            "Products CSV",
        "ugaoo_orders.csv":              "Orders CSV",
        "ugaoo_customers.csv":           "Customers CSV",
        "ugaoo_city_channel_sales.csv":  "Sales CSV",
    }

    # 1. Process PDFs
    print("Step 1: Extracting text from PDFs...")
    for pdf_name in PDF_FILES:
        path = os.path.join(DATA_DIR, pdf_name)
        if os.path.exists(path):
            print(f"  Reading {pdf_name}...")
            text = extract_text_from_pdf(path)
            label = SOURCE_LABELS.get(pdf_name, pdf_name)
            chunks = text_splitter.split_text(text)
            all_documents.extend(
                [Document(page_content=chunk, metadata={"source": label}) for chunk in chunks]
            )
        else:
            print(f"  Warning: {pdf_name} not found!")

    # 2. Process CSVs
    print("Step 2: Extracting text from CSVs...")
    for csv_name in CSV_FILES:
        path = os.path.join(DATA_DIR, csv_name)
        if os.path.exists(path):
            print(f"  Reading {csv_name}...")
            text = extract_text_from_csv(path)
            label = SOURCE_LABELS.get(csv_name, csv_name)
            chunks = text_splitter.split_text(text)
            all_documents.extend(
                [Document(page_content=chunk, metadata={"source": label}) for chunk in chunks]
            )
        else:
            alt_name = "ugaoo_customers_city_channel_sales.csv"
            alt_path = os.path.join(DATA_DIR, alt_name)
            if os.path.exists(alt_path):
                print(f"  Reading {alt_name}...")
                text = extract_text_from_csv(alt_path)
                label = SOURCE_LABELS.get(alt_name, alt_name)
                chunks = text_splitter.split_text(text)
                all_documents.extend(
                    [Document(page_content=chunk, metadata={"source": label}) for chunk in chunks]
                )
            else:
                print(f"  Warning: {csv_name} (or variant) not found!")

    print(f"Step 3: Total chunks created: {len(all_documents)}")

    # 4. Create Embeddings and Save FAISS Index
    print("Step 4: Creating embeddings (all-MiniLM-L6-v2) and FAISS index...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    all_documents = [doc for doc in all_documents if doc.page_content.strip()]
    vector_store = FAISS.from_documents(all_documents, embeddings)

    if not os.path.exists(INDEX_PATH):
        os.makedirs(INDEX_PATH)

    vector_store.save_local(INDEX_PATH)
    print(f"DONE! {len(all_documents)} chunks indexed with source metadata.")

if __name__ == "__main__":
    main()
