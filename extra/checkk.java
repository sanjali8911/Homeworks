import java.util.*;
public class checkk {
    public static void main(String args[]) {
        Scanner sc = new Scanner(System.in);
int a = sc.nextInt();
System.out.println(a);
int rexa[] = new int[a];
for(int i =0; i<a; i++) {
    rexa[i] = sc.nextInt();
}
int out = sc.nextInt();
System.out.println(rexa[out]);
    }
}