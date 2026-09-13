# Decibel Garage

AI car audio recommendation site. Enter a car's year/make/model, budget, and
sound priority, and get a specific head unit / speaker / sub / amp build back.

## Deploy this (no coding required)

1. Go to github.com, click the **+** in the top right, and choose **New repository**.
   Name it `decibel-garage`, keep it public or private, and create it.
2. On the empty repo page, click **uploading an existing file**.
3. Drag this entire folder's contents into the upload box (everything inside
   `decibel-garage/`, not the outer folder itself) and commit.
4. Go to vercel.com, sign in with GitHub, click **Add New Project**, and
   import the `decibel-garage` repo. Vercel will detect it's a Vite project
   automatically.
5. Before clicking Deploy, open **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your API key from console.anthropic.com (Settings → API Keys)
6. Click **Deploy**. In about a minute you'll get a live URL like
   `decibel-garage.vercel.app`.
7. Test it: open the URL, fill in the form, and confirm a build appears.

## Adding your own domain

In the Vercel project settings, go to **Domains** and add the domain you
bought (e.g. decibelgarage.com). Vercel will show you 1-2 DNS records to add
at your domain registrar — it walks you through it on screen.

## Adding real affiliate links

Once you're approved for Crutchfield / Amazon Associates / Sonic Electronix,
open `src/App.jsx`, find the `shopUrl` function near the top, and swap in
your affiliate link format and ID.
