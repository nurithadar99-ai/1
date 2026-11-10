"""
סקריפט העלאה אוטומטי ל-GitHub Pages
שימוש:
python deploy.py <GITHUB_TOKEN>
או הרצה ללא פרמטרים להזנת Token אישי
"""

import sys
import os
import dulwich.porcelain as porcelain

REPO_URL = "https://github.com/nurithadar99-ai/1.git"

def main():
    token = None
    if len(sys.argv) > 1:
        token = sys.argv[1].strip()
    elif "GITHUB_TOKEN" in os.environ:
        token = os.environ["GITHUB_TOKEN"].strip()
    
    repo = porcelain.open_repo('.')
    
    # וידוא שכל הקבצים נוספו והתחייבו
    porcelain.add(repo, paths=['index.html', 'style.css', 'verbsData.js', 'sound.js', 'app.js', 'README.md'])
    try:
        porcelain.commit(repo, message=b"Update Hebrew Verb System Practice Game")
    except Exception:
        pass # Nothing new to commit

    # קביעת ענף main
    head_id = repo[b'HEAD'].id
    repo.refs[b'refs/heads/main'] = head_id

    if not token:
        print("\n" + "="*60)
        print("נדרש GitHub Personal Access Token לצורך העלאה לריפו:")
        print(REPO_URL)
        print("ניתן ליצור טוקן בקלות בכתובת:")
        print("https://github.com/settings/tokens (עם הרשאת 'repo')")
        print("="*60 + "\n")
        try:
            token = input("הכנס/י את ה-GitHub Token שלך: ").strip()
        except EOFError:
            pass

    if not token:
        print("לא סופק Token. הקבצים שמורים ומחויבים מקומית ב-Git.")
        sys.exit(1)

    auth_url = f"https://{token}@github.com/nurithadar99-ai/1.git"
    print(f"מעלה את הפרויקט לענף main ב-GitHub...")
    try:
        porcelain.push(repo, auth_url, "refs/heads/main:refs/heads/main")
        print("\n" + "="*60)
        print("העלאה ל-GitHub הושלמה בהצלחה! 🚀")
        print("המשחק זמין לצפייה והפצה לתלמידים דרך GitHub Pages:")
        print("https://nurithadar99-ai.github.io/1/")
        print("="*60 + "\n")
    except Exception as e:
        print("שגיאה בהעלאה ל-GitHub:", e)
        sys.exit(1)

if __name__ == "__main__":
    main()
