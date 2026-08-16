import { createClient } from "@/lib/supabase/server";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { BulkInviteForm } from "@/components/admin/bulk-invite-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function NewUserPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Invite account</h1>
        <p className="text-sm text-muted-foreground">
          Invite a Teacher or Student by email — they&apos;ll set their own password.
        </p>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Single account</TabsTrigger>
          <TabsTrigger value="bulk">Bulk CSV upload</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mx-auto w-full max-w-md">
          <CreateUserForm />
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk invite from CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkInviteForm courses={courses ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
