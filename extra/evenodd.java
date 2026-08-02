import java.util.*;
public class evenodd{
    public static void printtable(int n) {
        for(int i=1; i<=10; i++) {
            System.out.println(i*n);
        }
    }

    public static void main(String args[]) {
 Scanner sc = new Scanner(System.in); 
        int n = sc.nextInt();
        printtable(n);
    }
}